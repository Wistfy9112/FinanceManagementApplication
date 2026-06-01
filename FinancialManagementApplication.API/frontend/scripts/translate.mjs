import { readFileSync, writeFileSync } from 'fs';

const filePath = process.argv[2];
let content = readFileSync(filePath, 'utf-8');

const replacements = [
  'Vốn ban đầu (Funds)',
  'Giá trị hiện tại (Current)',
  'Lợi nhuận (Interest)',
  'Tỷ suất (Interest ratio)',
  'Ngày cập nhật',
  'Hành động',
  '\u{1F4B3} Sinh hoạt',
  '\u{1F3E6} Tiết kiệm',
  '\u{1F4C8} Đầu tư',
  'Tổng tài sản',
  'Lịch sử lưu thông tin',
  'Sửa tài sản',
  'Xóa tài sản',
  'Vốn ban đầu',
  'Loại',
  'Danh mục',
  'Số tiền',
  'Tỉ trọng',
  'Hủy',
  'Lưu Thiết Lập',
  'Phân bổ gốc (Base Amount)',
  'Tổng đã phân bổ',
  'Phân loại',
  'Tên danh mục',
  'Số tiền (Cash)',
  'Tỉ trọng (%)',
  'Tên danh mục...',
  '-- Liên kết tài sản --',
  'Xóa danh mục',
  'Tổng cộng',
  'Thêm danh mục',
  'Lịch sử phân bổ',
  'Thiết lập mới',
  'Lưu Phân Bổ Thực Tế',
  'Thu nhập (Income)',
  'Số tiền cần giảm (Target)',
  'Khối',
  'Thông tin phân bổ (Allocations Info)',
  'Số tiền giảm',
  'Số tiền thực tế',
  'Loại trừ',
  'Áp dụng',
  '\u{1F6E1}\uFE0F Khóa',
  'Còn lại (Saving Base)',
  'Đầu tư (Investment Base)',
  'Tổng dòng',
  'Cân đối (Balanced)',
  'Gốc: ',
  'Phân bổ gốc: ',
  ' tài sản \u00B7 tổng ',
];

let count = 0;
for (const vi of replacements) {
  const pieces = [];
  let lastIndex = 0;
  let idx;
  
  while ((idx = content.indexOf(vi, lastIndex)) !== -1) {
    // Check if already wrapped
    const before = content.slice(Math.max(0, idx - 3), idx);
    const after = content.slice(idx + vi.length, idx + vi.length + 2);
    
    if (before === "t('" && after === "')") {
      // Already wrapped, skip
      pieces.push(content.slice(lastIndex, idx + vi.length));
    } else {
      // Not wrapped, wrap it
      pieces.push(content.slice(lastIndex, idx));
      pieces.push("{t('" + vi + "')}");
      count++;
    }
    lastIndex = idx + vi.length;
  }
  pieces.push(content.slice(lastIndex));
  content = pieces.join('');
}

writeFileSync(filePath, content, 'utf-8');
console.log('Done. Total replacements: ' + count);
