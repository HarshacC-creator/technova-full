let products=[],cart=[];
const $=s=>document.querySelector(s);
async function loadProducts(){const r=await fetch("/api/products");products=await r.json();renderProducts();}
function money(n){return "₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});}
function renderProducts(){
 const q=$("#search").value.toLowerCase(),cat=$("#category").value;
 const list=products.filter(p=>(!q||`${p.name} ${p.brand} ${p.description}`.toLowerCase().includes(q))&&(!cat||p.category===cat));
 $("#products").innerHTML=list.map(p=>`<article class="product"><div class="product-img">${p.image?`<img src="${p.image}" alt="${escapeHtml(p.name)}">`:`<div class="placeholder">TN</div>`}</div><div class="product-body"><small>${escapeHtml(p.brand||"TechNova Store")}</small><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||"")}</p><div class="product-foot"><span class="price">${money(p.price)}</span><button class="add" onclick="addToCart(${p.id})">${p.stock>0?"Add to cart":"Out of stock"}</button></div></div></article>`).join("")||"<p>No products found.</p>";
}
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p||p.stock<1)return;const x=cart.find(i=>i.id===id);if(x)x.qty++;else cart.push({id:p.id,name:p.name,price:p.price,qty:1});renderCart();}
function renderCart(){$("#cartCount").textContent=cart.reduce((a,b)=>a+b.qty,0);$("#cartItems").innerHTML=cart.length?cart.map(i=>`<div class="cart-item"><div>${escapeHtml(i.name)}<br><small>${money(i.price)} × ${i.qty}</small></div><button class="add" onclick="removeCart(${i.id})">Remove</button></div>`).join(""):"<p class='small'>Your cart is empty.</p>";$("#cartTotal").textContent=money(cart.reduce((a,b)=>a+b.price*b.qty,0));}
function removeCart(id){cart=cart.filter(i=>i.id!==id);renderCart();}
$("#search").addEventListener("input",renderProducts);$("#category").addEventListener("change",renderProducts);
$("#cartBtn").onclick=()=>{$("#cart").classList.add("open");$("#overlay").classList.add("show")};$("#closeCart").onclick=()=>{$("#cart").classList.remove("open");$("#overlay").classList.remove("show")};$("#overlay").onclick=$("#closeCart").onclick;
$("#checkout").onclick=()=>alert("Checkout is ready for secure payment-gateway integration. Do not accept live payments until a backend payment flow is connected.");
$("#contactForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target);const body=Object.fromEntries(f.entries());const r=await fetch("/api/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();$("#contactMsg").textContent=d.ok?"Thanks. Your enquiry was sent.":"Could not send enquiry.";if(d.ok)e.target.reset();});
loadProducts();