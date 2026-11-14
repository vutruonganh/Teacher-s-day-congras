# Người lái đò — Một đời đưa đò, vạn lời tri ân

Website trải nghiệm tương tác nhân ngày Nhà giáo Việt Nam 20/11, kể câu chuyện
một chuyến đò qua 6 "bến" — từ bảng đen, trang vở, lớp học nắng, lá thư, món quà
đến khúc sông hoàng hôn.

Toàn bộ hình ảnh là SVG/CSS nội tuyến, không phụ thuộc ảnh ngoài.

## Chạy website

Cách đơn giản nhất: mở trực tiếp `index.html` bằng trình duyệt.

Nếu muốn chạy qua máy chủ tĩnh (khuyến nghị khi kiểm tra trên điện thoại):

```
python -m http.server 8000
# hoặc
npx serve .
```

Sau đó mở `http://localhost:8000/`.

## Cấu trúc

```
index.html          Bố cục 6 bến + HUD + nút điều khiển + cấu hình SITE_CONFIG
css/style.css       Toàn bộ giao diện, chủ đề màu theo từng bến, responsive
js/app.js           Luồng 6 bến, cá nhân hoá, thư, quà, chia sẻ, bàn phím, vuốt
js/audio.js         Web Audio: nhạc nền + hiệu ứng
js/effects.js       Canvas hạt: bụi phấn, bụi nắng, cánh hoa, đom đóm
assets/audio/       Nơi đặt file nhạc nền (tự tạo khi cần)
```

## Cá nhân hoá đường dẫn

| Tham số | Tác dụng | Ví dụ |
| --- | --- | --- |
| `to` | Tên người nhận, hiện ở đầu lá thư và cuối trang | `?to=Thầy%20Minh` |
| `from` | Tên người gửi, hiện ở chữ ký lá thư | `?from=Lớp%2012A` |

Ví dụ đầy đủ:

```
index.html?to=Cô%20Lan&from=Nhóm%20học%20trò%2010A3
```

- Nút "Sao chép đường dẫn" ở bến 06 sẽ sao chép đường dẫn **kèm** hai tham số này.
- Nút "Chia sẻ" ở bến 04 dùng `navigator.share` nếu trình duyệt hỗ trợ, nếu không
  sẽ tự sao chép đường dẫn.
- Tên được cắt tối đa 40 ký tự để tránh vỡ bố cục.

## Nhạc nền

Website đang dùng file `assets/audio/bgm.mp3` (bản nhạc do bạn cung cấp, dài ~19 giây,
tự lặp lại). Nếu file bị thiếu hoặc lỗi, website tự quay về bản nhạc hộp tổng hợp
bằng Web Audio nên không bao giờ im lặng.

Muốn đổi sang file khác:

1. Chép file mới vào `assets/audio/`, giữ tên `bgm.mp3` (hoặc đổi tên tuỳ ý).
2. Mở `index.html`, sửa dòng cấu hình gần cuối trang:

```html
<script>
  window.SITE_CONFIG = { bgm: 'assets/audio/bgm.mp3' };
</script>
```

Nhạc chỉ bắt đầu sau thao tác đầu tiên của người xem (click/chạm/phím) theo quy
định autoplay của trình duyệt. Nút "Nhạc" ở góc phải bật/tắt và ghi nhớ lựa chọn
trong `localStorage` (khoá `nld-muted`). Nếu file lỗi, website tự quay về nhạc
tổng hợp.

## Điều khiển

- Nút chính ở dưới: đi tiếp / mở thư / mở quà / xem lại.
- Nút "Quay lại" ở bên trái.
- Bàn phím: `←` `→` để chuyển bến.
- Điện thoại: vuốt ngang để chuyển bến.
- Bến 02: bấm vào dòng kế tiếp (hoặc nút "Điều tiếp theo") để hiện từng điều thầm lặng.
- Bến 04: bấm phong bì hoặc nút "Đọc lời chúc" để mở thư.
- Bến 05: bấm hộp quà hoặc nút "Mở quà"; sau khi mở có nút "Mở lại".

## Ghi chú kỹ thuật

- Không dùng thư viện ngoài; chỉ tải font Google Fonts.
- Tôn trọng `prefers-reduced-motion`: giảm animation và hiệu ứng hạt.
- Đã kiểm tra không có cuộn ngang và không cắt nội dung ở các kích thước
  320×568, 360×640, 390×844, 740×420, 800×662, 844×390, 1280×800, 1440×900.
