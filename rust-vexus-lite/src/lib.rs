#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use usearch::Index;

/// Mapping结构：Tag文本 <-> Label数字
#[derive(Serialize, Deserialize)]
struct Mapping {
    label_to_tag: HashMap<u32, String>,
    tag_to_label: HashMap<String, u32>,
    #[serde(skip)]
    next_label: AtomicU32,
}

impl Clone for Mapping {
    fn clone(&self) -> Self {
        let next_val = self.next_label.load(Ordering::SeqCst);
        Self {
            label_to_tag: self.label_to_tag.clone(),
            tag_to_label: self.tag_to_label.clone(),
            next_label: AtomicU32::new(next_val),
        }
    }
}

impl Mapping {
    fn new() -> Self {
        Self {
            label_to_tag: HashMap::new(),
            tag_to_label: HashMap::new(),
            next_label: AtomicU32::new(0),
        }
    }

    fn get_or_create_label(&mut self, tag: &str) -> u32 {
        if let Some(&label) = self.tag_to_label.get(tag) {
            return label;
        }

        let new_label = self.next_label.fetch_add(1, Ordering::SeqCst);
        self.tag_to_label.insert(tag.to_string(), new_label);
        self.label_to_tag.insert(new_label, tag.to_string());
        new_label
    }

    fn get_tag(&self, label: u32) -> Option<&String> {
        self.label_to_tag.get(&label)
    }

    fn remove(&mut self, tag: &str) -> Option<u32> {
        if let Some(label) = self.tag_to_label.remove(tag) {
            self.label_to_tag.remove(&label);
            Some(label)
        } else {
            None
        }
    }
}

/// 搜索结果
#[napi(object)]
pub struct SearchResult {
    pub tag: String,
    pub score: f64,  // 改为f64，napi支持
}

/// 统计信息
#[napi(object)]
pub struct VexusStats {
    pub total_vectors: u32,
    pub dimensions: u32,
    pub capacity: u32,
}

/// 核心索引结构
#[napi]
pub struct VexusIndex {
    index: Arc<RwLock<Index>>,
    mapping: Arc<RwLock<Mapping>>,
    dimensions: u32,
}

#[napi]
impl VexusIndex {
    /// 创建新的空索引
    #[napi(constructor)]
    pub fn new(dim: u32, capacity: u32) -> Result<Self> {
        let index = Index::new(&usearch::IndexOptions {
            dimensions: dim as usize,
            metric: usearch::MetricKind::L2sq,
            quantization: usearch::ScalarKind::F32,
            connectivity: 16,
            expansion_add: 128,
            expansion_search: 64,
            multi: false,  // 添加multi字段
        })
        .map_err(|e| Error::from_reason(format!("Failed to create index: {:?}", e)))?;

        index
            .reserve(capacity as usize)
            .map_err(|e| Error::from_reason(format!("Failed to reserve capacity: {:?}", e)))?;

        Ok(Self {
            index: Arc::new(RwLock::new(index)),
            mapping: Arc::new(RwLock::new(Mapping::new())),
            dimensions: dim,
        })
    }

    /// 从磁盘加载索引（静态方法）- 改为同步
    #[napi(factory)]
    pub fn load(index_path: String, map_path: String) -> Result<Self> {
        // 读取映射文件
        let map_data = std::fs::read(&map_path)
            .map_err(|e| Error::from_reason(format!("Failed to read mapping: {}", e)))?;

        let mut mapping: Mapping = bincode::deserialize(&map_data)
            .map_err(|e| Error::from_reason(format!("Failed to deserialize mapping: {}", e)))?;

        // 恢复next_label计数器
        if !mapping.label_to_tag.is_empty() {
            let max_label = *mapping.label_to_tag.keys().max().unwrap();
            mapping.next_label = AtomicU32::new(max_label + 1);
        }

        // 创建临时索引并加载
        let temp_index = Index::new(&usearch::IndexOptions {
            dimensions: 1536,  // 临时维度，加载后会被覆盖
            metric: usearch::MetricKind::L2sq,
            quantization: usearch::ScalarKind::F32,
            connectivity: 16,
            expansion_add: 128,
            expansion_search: 64,
            multi: false,
        })
        .map_err(|e| Error::from_reason(format!("Failed to create temp index: {:?}", e)))?;

        // 加载索引文件
        temp_index.load(&index_path)
            .map_err(|e| Error::from_reason(format!("Failed to load index: {:?}", e)))?;

        let dimensions = temp_index.dimensions() as u32;

        Ok(Self {
            index: Arc::new(RwLock::new(temp_index)),
            mapping: Arc::new(RwLock::new(mapping)),
            dimensions,
        })
    }

    /// 保存到磁盘 - 改为同步
    #[napi]
    pub fn save(&self, index_path: String, map_path: String) -> Result<()> {
        // 序列化映射
        let mapping = self.mapping.blocking_read();
        let map_data = bincode::serialize(&*mapping)
            .map_err(|e| Error::from_reason(format!("Failed to serialize mapping: {}", e)))?;

        // 保存映射（临时文件 + 重命名）
        let temp_map_path = format!("{}.tmp", map_path);
        std::fs::write(&temp_map_path, &map_data)
            .map_err(|e| Error::from_reason(format!("Failed to write mapping temp: {}", e)))?;

        std::fs::rename(&temp_map_path, &map_path)
            .map_err(|e| Error::from_reason(format!("Failed to rename mapping: {}", e)))?;

        // 保存索引
        let index = self.index.blocking_read();
        let temp_index_path = format!("{}.tmp", index_path);

        index
            .save(&temp_index_path)
            .map_err(|e| Error::from_reason(format!("Failed to save index: {:?}", e)))?;

        std::fs::rename(&temp_index_path, &index_path)
            .map_err(|e| Error::from_reason(format!("Failed to rename index: {}", e)))?;

        Ok(())
    }

    /// 批量添加/更新向量 - 改为同步，使用Buffer传递数据
    #[napi]
    pub fn upsert(&self, tags: Vec<String>, vectors: Buffer) -> Result<()> {
        let mut mapping = self.mapping.blocking_write();
        let index = self.index.blocking_write();

        // 将Buffer转换为f32数组
        let vec_data: &[f32] = unsafe {
            std::slice::from_raw_parts(
                vectors.as_ptr() as *const f32,
                vectors.len() / std::mem::size_of::<f32>(),
            )
        };

        let vec_dim = self.dimensions as usize;
        let num_vectors = tags.len();

        if vec_data.len() != num_vectors * vec_dim {
            return Err(Error::from_reason(format!(
                "Vector data size mismatch: expected {} floats, got {}",
                num_vectors * vec_dim,
                vec_data.len()
            )));
        }

        for (i, tag) in tags.iter().enumerate() {
            let label = mapping.get_or_create_label(tag);
            let vector_start = i * vec_dim;
            let vector = &vec_data[vector_start..vector_start + vec_dim];

            index
                .add(label as u64, vector)
                .map_err(|e| Error::from_reason(format!("Failed to add vector: {:?}", e)))?;
        }

        Ok(())
    }

    /// 快速搜索 - 改为同步，使用Buffer传递query
    #[napi]
    pub fn search(&self, query: Buffer, k: u32) -> Result<Vec<SearchResult>> {
        let mapping = self.mapping.blocking_read();
        let index = self.index.blocking_read();

        // 将Buffer转换为f32数组
        let query_data: &[f32] = unsafe {
            std::slice::from_raw_parts(
                query.as_ptr() as *const f32,
                query.len() / std::mem::size_of::<f32>(),
            )
        };

        let matches = index
            .search(query_data, k as usize)
            .map_err(|e| Error::from_reason(format!("Search failed: {:?}", e)))?;

        let mut results = Vec::new();
        for m in matches.keys.iter().zip(matches.distances.iter()) {
            let label = *m.0 as u32;
            let distance = *m.1;

            if let Some(tag) = mapping.get_tag(label) {
                results.push(SearchResult {
                    tag: tag.clone(),
                    score: (1.0 - distance as f64), // 转换为相似度分数
                });
            }
        }

        Ok(results)
    }

    /// 删除tags - 改为同步
    #[napi]
    pub fn remove(&self, tags: Vec<String>) -> Result<()> {
        let mut mapping = self.mapping.blocking_write();
        let index = self.index.blocking_write();

        for tag in tags {
            if let Some(label) = mapping.remove(&tag) {
                index
                    .remove(label as u64)
                    .map_err(|e| Error::from_reason(format!("Failed to remove: {:?}", e)))?;
            }
        }

        Ok(())
    }

    /// 获取统计信息 - 改为同步
    #[napi]
    pub fn stats(&self) -> Result<VexusStats> {
        let index = self.index.blocking_read();

        Ok(VexusStats {
            total_vectors: index.size() as u32,
            dimensions: self.dimensions,
            capacity: index.capacity() as u32,
        })
    }
}