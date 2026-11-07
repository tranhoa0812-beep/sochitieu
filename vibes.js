/* Bảng màu và vibe của app.
   THÊM VIBE MỚI:
   1. Thêm 1 bảng màu vào PALETTES (10 màu bản sáng "l", 10 màu bản tối "d", theo thứ tự PAL_KEYS).
   2. Thêm 1 mục vào VIBES: tên, bảng màu, ảnh đại diện, dải ảnh trang trí, ảnh tiêu đề từng trang.
   3. Ảnh để trong img/<mã vibe>/ (jpg nền trùng màu nền ảnh gốc, cạnh dài ~200px).
   4. Trang trí riêng (nếu có) viết CSS trong index.html theo :root[data-vibe="<mã vibe>"].
   5. Thêm ảnh mới vào danh sách FILES trong sw.js và tăng VERSION trong sw.js. */

// thứ tự: nền, thẻ, nền phụ, viền, chữ, chữ phụ, màu chủ đạo, chữ trên nút, nền nhạt, viền/thanh
window.PAL_KEYS = ['--bg','--surface','--surface-2','--line','--ink','--muted','--green','--on-green','--green-soft','--green-bag'];

window.PALETTES = {
  noel:    {name:'Giáng sinh', l:['#F8F7F2','#FFFDF9','#EFE8DC','#E4D9C7','#3A2A22','#7D6B5E','#A63D2B','#FFFFFF','#F1E2D6','#8AA27E'], d:['#17130F','#221C17','#2C251E','#3B3229','#F3EADF','#B5A595','#E8907A','#2A0F08','#3A2A22','#7F9973']},
  pink:    {name:'Hồng phấn', l:['#FBF4F6','#FFFFFF','#F8E8ED','#F0D9E0','#2E1F24','#7A6268','#AD4468','#FFFFFF','#FBE1EA','#F2A7BF'], d:['#1A1215','#241A1E','#2E2126','#3D2C32','#F3E6EA','#B39CA3','#F2A7BF','#2A1019','#3D2430','#D9849F']},
  lavender:{name:'Oải hương', l:['#F6F4FB','#FFFFFF','#ECE7F7','#DED6F0','#251F33','#6B6380','#6F51AD','#FFFFFF','#E7DEFA','#C3B1EC'], d:['#14111C','#1D1828','#262033','#352D45','#ECE6F7','#A79DBE','#C3B1EC','#1E1433','#2E2445','#A08ED6']},
  blue:    {name:'Xanh baby', l:['#F3F7FC','#FFFFFF','#E4EEF9','#D3E1F1','#1A2533','#5F6E80','#36679F','#FFFFFF','#DCEAFA','#A9CBEF'], d:['#0F141B','#171E28','#1F2834','#2C3847','#E3ECF7','#9AA9BB','#A9CBEF','#0E2033','#1F3045','#84ADD9']},
  mint:    {name:'Bạc hà',    l:['#F1F8F6','#FFFFFF','#E0F1EC','#CFE6DF','#17302A','#5A746D','#27766A','#FFFFFF','#D3EEE6','#8FD3C1'], d:['#0E1715','#16221F','#1E2D29','#2A3D38','#DDF0EA','#93ADA6','#8FD3C1','#0C2620','#1F3A33','#6DBBA7']},
  peach:   {name:'Cam đào',   l:['#FCF6F2','#FFFFFF','#F8EADF','#F0DACB','#33231A','#7F6658','#A9532F','#FFFFFF','#FCE3D4','#F5B996'], d:['#1A130F','#241B16','#2E231C','#3E2F26','#F5E8DF','#B8A194','#F5B996','#33190B','#3D2A1F','#D9946E']},
  green:   {name:'Xanh lá',   l:['#F4F7EC','#FFFFFF','#ECF2DF','#DCE4CC','#1E2915','#626D55','#44801D','#FFFFFF','#DDEFC6','#9BCB5B'], d:['#10150C','#192013','#212A19','#2E3A24','#E7EEDB','#9BA78C','#8FC957','#11200A','#28391B','#7FB04A']}
};

window.VIBES = {
  noel: {
    name: 'Giáng sinh',
    palette: 'noel',
    icon: 'img/noel/stocking.jpg',
    band: ['img/noel/tree.jpg', 'img/noel/wreath.jpg', 'img/noel/santa.jpg', 'img/noel/gifts.jpg', 'img/noel/mug.jpg'],
    pageIcons: { 'ke-hoach': 'img/noel/candle.jpg', 'bao-cao': 'img/noel/pudding.jpg', 'nguyen-tac': 'img/noel/wreath.jpg' },
    sparks: true,
    // dòng phụ dưới lời chào; trả về '' để dùng dòng mặc định
    greet: today => {
      const y = today.getFullYear();
      let xmas = new Date(y, 11, 25);
      if (today > new Date(y, 11, 26)) xmas = new Date(y + 1, 11, 25);
      const n = Math.round((xmas - new Date(y, today.getMonth(), today.getDate())) / 864e5);
      if (n <= 1 && n >= -1) return 'Giáng sinh an lành!';
      return n > 0 && n <= 60 ? `còn ${n} ngày tới Giáng sinh` : '';
    }
  },
  basic: {
    name: 'Cơ bản',
    palette: 'pink',
    icon: 'img/bag.jpg',
    band: [],
    pageIcons: {},
    sparks: false,
    greet: () => ''
  }
};
