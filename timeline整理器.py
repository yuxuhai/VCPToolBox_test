import os
import re
from collections import defaultdict

def process_timeline_file(input_path, output_path):
    """
    读取一个时间线文件，按日期排序条目，合并同一天的条目，
    删除空行，并将结果写入一个新文件。
    """
    # 使用 defaultdict 轻松地为每个日期追加列表
    date_entries = defaultdict(list)
    current_date = None

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue  # 跳过空行

                # 检查日期标题，如 ## 2025-03-31
                date_match = re.match(r'^##\s*(\d{4}-\d{2}-\d{2})', line)
                if date_match:
                    current_date = date_match.group(1)
                elif line.startswith('-') and current_date:
                    # 这是当前日期的内容行
                    # 删除可能存在的末尾 '<' 字符
                    if line.endswith('<'):
                        line = line[:-1].strip()
                    date_entries[current_date].append(line)

        if not date_entries:
            print(f"在 {input_path} 中未找到任何条目，已跳过。")
            return

        # 按升序（最早优先）对日期进行排序
        sorted_dates = sorted(date_entries.keys())

        # 将处理后的内容写入输出文件
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, date in enumerate(sorted_dates):
                f.write(f"## {date}\n")
                for entry in date_entries[date]:
                    f.write(f"{entry}\n")
                # 在日期块之间添加一个空行以提高可读性，但最后一个块后面不加
                if i < len(sorted_dates) - 1:
                    f.write("\n")
        
        print(f"成功处理 '{input_path}' -> '{output_path}'")

    except FileNotFoundError:
        print(f"错误: 在 {input_path} 未找到输入文件")
    except Exception as e:
        print(f"处理 {input_path} 时发生错误: {e}")


def main():
    """
    主函数，用于查找和处理所有时间线文件。
    """
    input_dir = 'timeline'
    output_dir = 'TVStxt'

    # 如果目录不存在，则创建它们
    if not os.path.exists(input_dir):
        os.makedirs(input_dir)
        print(f"已创建输入目录: '{input_dir}'")
        print("请将您的 'XXXtimeline.txt' 文件添加到此目录中，然后再次运行脚本。")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"已创建输出目录: '{output_dir}'")

    # 在输入目录中查找所有以 'timeline.txt' 结尾的文件
    processed_count = 0
    for filename in os.listdir(input_dir):
        if filename.endswith("timeline.txt"):
            input_file_path = os.path.join(input_dir, filename)
            output_file_path = os.path.join(output_dir, filename)
            process_timeline_file(input_file_path, output_file_path)
            processed_count += 1
    
    if processed_count == 0:
        print(f"在 '{input_dir}' 目录中没有找到需要处理的 'XXXtimeline.txt' 文件。")


if __name__ == "__main__":
    main()
    print("\n时间线整理完成。")