const cartBtn = document.getElementById('cart-btn');
const likedBtn = document.getElementById('liked-btn');


cartBtn.addEventListener('click', () => {
  cartBtn.classList.add('active');
  cartBtn.classList.remove('inactive');
  likedBtn.classList.remove('active');
  likedBtn.classList.add('inactive');
});


likedBtn.addEventListener('click', () => {
  likedBtn.classList.add('active');
  likedBtn.classList.remove('inactive');
  cartBtn.classList.remove('active');
  cartBtn.classList.add('inactive');
});
