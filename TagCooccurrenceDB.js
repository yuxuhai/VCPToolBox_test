// TagCooccurrenceDB.js
// 🌟 Tag共现权重数据库（轻量级SQLite模块）
// 职责：记录tag组 → 计算共现权重 → 导出权重矩阵（供内存加载）

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Tag共现关系数据库
 * 设计理念：构建tag的"毛边网络"，捕获人工标注的语义关联
 */
class TagCooccurrenceDB {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, 'VectorStore', 'TagCooccurrence.db');
        this.db = null;
        this.initialized = false;
        
        console.log('[TagCooccurrenceDB] Initialized:', this.dbPath);
    }
    
    /**
     * 初始化数据库
     */
    async initialize() {
        if (this.initialized) return;
        
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        
        // 创建表：tag组快照（用于diff更新）
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tag_groups (
                group_id TEXT PRIMARY KEY,
                tags_json TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                diary_name TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            CREATE INDEX IF NOT EXISTS idx_diary ON tag_groups(diary_name);
        `);
        
        // 创建表：tag共现矩阵（稀疏存储）
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tag_pairs (
                tag_a TEXT NOT NULL,
                tag_b TEXT NOT NULL,
                weight INTEGER DEFAULT 1,
                PRIMARY KEY (tag_a, tag_b),
                CHECK (tag_a < tag_b)
            );
            CREATE INDEX IF NOT EXISTS idx_tag_a ON tag_pairs(tag_a);
            CREATE INDEX IF NOT EXISTS idx_tag_b ON tag_pairs(tag_b);
        `);
        
        // 预编译语句
        this.stmts = {
            saveGroup: this.db.prepare(`
                INSERT OR REPLACE INTO tag_groups (group_id, tags_json, content_hash, diary_name)
                VALUES (?, ?, ?, ?)
            `),
            getGroup: this.db.prepare(`
                SELECT tags_json, content_hash FROM tag_groups WHERE group_id = ?
            `),
            deleteGroup: this.db.prepare(`
                DELETE FROM tag_groups WHERE group_id = ?
            `),
            upsertPair: this.db.prepare(`
                INSERT INTO tag_pairs (tag_a, tag_b, weight)
                VALUES (?, ?, 1)
                ON CONFLICT(tag_a, tag_b) DO UPDATE SET weight = weight + 1
            `),
            decreasePair: this.db.prepare(`
                UPDATE tag_pairs SET weight = weight - 1
                WHERE tag_a = ? AND tag_b = ? AND weight > 0
            `),
            getAllPairs: this.db.prepare(`
                SELECT tag_a, tag_b, weight FROM tag_pairs WHERE weight > 0
            `)
        };
        
        this.initialized = true;
        console.log('[TagCooccurrenceDB] ✅ Database ready');
    }
    
    /**
     * 🌟 记录一组tag（增量diff更新）
     * @param {string} groupId - 唯一标识（如文件路径）
     * @param {Array<string>} tags - tag数组
     * @param {string} diaryName - 日记本名称
     */
    recordTagGroup(groupId, tags, diaryName = null) {
        if (!this.initialized) throw new Error('Not initialized');
        if (!tags || tags.length < 2) return; // 少于2个tag无法构成共现
        
        // 去重排序
        const uniqueTags = [...new Set(tags)].sort();
        const tagsJson = JSON.stringify(uniqueTags);
        const hash = crypto.createHash('md5').update(tagsJson).digest('hex');
        
        // 检查是否已存在
        const existing = this.stmts.getGroup.get(groupId);
        
        if (existing && existing.content_hash === hash) {
            return; // 未变化，跳过
        }
        
        // 事务处理
        const transaction = this.db.transaction(() => {
            // 如果是更新，先移除旧关系
            if (existing) {
                const oldTags = JSON.parse(existing.tags_json);
                this._decreasePairs(oldTags);
            }
            
            // 保存新组
            this.stmts.saveGroup.run(groupId, tagsJson, hash, diaryName);
            
            // 增加新关系
            this._increasePairs(uniqueTags);
        });
        
        transaction();
    }
    
    /**
     * 删除tag组
     */
    removeTagGroup(groupId) {
        if (!this.initialized) return;
        
        const existing = this.stmts.getGroup.get(groupId);
        if (!existing) return;
        
        const transaction = this.db.transaction(() => {
            const tags = JSON.parse(existing.tags_json);
            this._decreasePairs(tags);
            this.stmts.deleteGroup.run(groupId);
        });
        
        transaction();
    }
    
    /**
     * 内部：增加tag对权重
     */
    _increasePairs(tags) {
        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const [a, b] = [tags[i], tags[j]].sort();
                this.stmts.upsertPair.run(a, b);
            }
        }
    }
    
    /**
     * 内部：减少tag对权重
     */
    _decreasePairs(tags) {
        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const [a, b] = [tags[i], tags[j]].sort();
                this.stmts.decreasePair.run(a, b);
            }
        }
    }
    
    /**
     * 🌟 导出权重矩阵（邻接表格式，供内存加载）
     * @returns {Map<string, Map<string, number>>} tag → {relatedTag → weight}
     */
    exportWeightMatrix() {
        if (!this.initialized) throw new Error('Not initialized');
        
        const matrix = new Map();
        const rows = this.stmts.getAllPairs.all();
        
        for (const row of rows) {
            const { tag_a, tag_b, weight } = row;
            
            // A → B
            if (!matrix.has(tag_a)) matrix.set(tag_a, new Map());
            matrix.get(tag_a).set(tag_b, weight);
            
            // B → A（对称）
            if (!matrix.has(tag_b)) matrix.set(tag_b, new Map());
            matrix.get(tag_b).set(tag_a, weight);
        }
        
        console.log(`[TagCooccurrenceDB] Exported matrix: ${matrix.size} tags, ${rows.length} pairs`);
        return matrix;
    }
    
    /**
     * 🌟 导出为JSON文件（持久化缓存）
     */
    async exportToFile(outputPath = null) {
        outputPath = outputPath || this.dbPath.replace('.db', '_matrix.json');
        
        const matrix = this.exportWeightMatrix();
        
        // 转换为序列化格式
        const serialized = {};
        for (const [tag, related] of matrix.entries()) {
            serialized[tag] = Object.fromEntries(related);
        }
        
        await fs.promises.writeFile(
            outputPath,
            JSON.stringify(serialized, null, 2),
            'utf-8'
        );
        
        console.log(`[TagCooccurrenceDB] ✅ Matrix exported to: ${outputPath}`);
        return outputPath;
    }
    
    /**
     * 获取统计
     */
    getStats() {
        if (!this.initialized) return null;
        
        const stats = this.db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM tag_groups) as total_groups,
                (SELECT COUNT(*) FROM tag_pairs WHERE weight > 0) as total_pairs,
                (SELECT COUNT(DISTINCT tag_a) + COUNT(DISTINCT tag_b) FROM tag_pairs) / 2 as unique_tags,
                (SELECT AVG(weight) FROM tag_pairs WHERE weight > 0) as avg_weight,
                (SELECT MAX(weight) FROM tag_pairs) as max_weight
        `).get();
        
        return stats;
    }
    
    /**
     * 关闭数据库
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('[TagCooccurrenceDB] Closed');
        }
    }
}

module.exports = TagCooccurrenceDB;