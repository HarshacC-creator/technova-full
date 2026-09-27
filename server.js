const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "CHANGE_THIS_SECRET_IN_PRODUCTION";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@technova.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeThisPasswordNow";

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "technova.db"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Everyday',
  image TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  phone TEXT,
  type TEXT,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const existingAdmin = db.prepare("SELECT id FROM admins WHERE email = ?").get(ADMIN_EMAIL);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.prepare("INSERT INTO admins (email, password_hash) VALUES (?, ?)").run(ADMIN_EMAIL, hash);
}

const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (!count) {
  const seed = db.prepare(`INSERT INTO products
    (name, brand, description, price, stock, category, image, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const starter = [
    ["Wireless Earbuds Pro","Third-Party Brand","Comfortable everyday wireless earbuds.",2499,25,"Earbuds & Audio",null,1],
    ["Premium Earbuds ANC","Third-Party Brand","Noise-cancelling earbuds for daily listening.",4999,12,"Earbuds & Audio",null,1],
    ["Everyday Carry Backpack","TechNova Store","Practical backpack for work and everyday use.",1799,20,"Everyday",null,0],
    ["Home Storage Organizer","Selected Home","Clean and practical home organization.",899,30,"Home",null,0]
  ];
  for (const p of starter) seed.run(...p);
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly:true, sameSite:"lax", secure:false, maxAge: 1000*60*60*8 }
}));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, "public")));

const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null,UPLOAD_DIR),
  filename: (_req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    const safe=Date.now()+"-"+Math.random().toString(36).slice(2,10)+ext;
    cb(null,safe);
  }
});
const upload = multer({
  storage,
  limits:{fileSize:5*1024*1024},
  fileFilter:(_req,file,cb)=>{
    const ok=["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, WEBP and GIF images are allowed."), ok);
  }
});

function auth(req,res,next){
  if(!req.session.adminId) return res.status(401).json({error:"Admin login required."});
  next();
}
function safeProduct(row){
  return {...row, featured:Boolean(row.featured)};
}

app.get("/api/products",(req,res)=>{
  const rows=db.prepare("SELECT * FROM products ORDER BY id DESC").all().map(safeProduct);
  res.json(rows);
});

app.post("/api/enquiries",(req,res)=>{
  const {name="",email="",phone="",type="",message=""}=req.body;
  if(!name.trim() || !email.trim() || !message.trim()) return res.status(400).json({error:"Name, email and message are required."});
  db.prepare("INSERT INTO enquiries (name,email,phone,type,message) VALUES (?,?,?,?,?)")
    .run(name.trim(),email.trim(),phone.trim(),type.trim(),message.trim());
  res.json({ok:true});
});

app.post("/api/admin/login",(req,res)=>{
  const {email="",password=""}=req.body;
  const admin=db.prepare("SELECT * FROM admins WHERE email=?").get(email.trim());
  if(!admin || !bcrypt.compareSync(password,admin.password_hash))
    return res.status(401).json({error:"Invalid email or password."});
  req.session.adminId=admin.id;
  req.session.adminEmail=admin.email;
  res.json({ok:true,email:admin.email});
});
app.post("/api/admin/logout",auth,(req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});
app.get("/api/admin/me",(req,res)=>{
  res.json({loggedIn:Boolean(req.session.adminId),email:req.session.adminEmail||null});
});

app.get("/api/admin/enquiries",auth,(req,res)=>{
  res.json(db.prepare("SELECT * FROM enquiries ORDER BY id DESC").all());
});

app.post("/api/admin/products",auth,upload.single("image"),(req,res)=>{
  const {name,brand,description,price,stock,category,featured}=req.body;
  if(!name || price===undefined) return res.status(400).json({error:"Product name and price are required."});
  const image=req.file ? "/uploads/"+req.file.filename : null;
  const info=db.prepare(`INSERT INTO products
    (name,brand,description,price,stock,category,image,featured)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(name.trim(),(brand||"").trim(),(description||"").trim(),Number(price)||0,Number(stock)||0,category||"Everyday",image,featured==="1"?1:0);
  res.json({ok:true,id:info.lastInsertRowid});
});

app.put("/api/admin/products/:id",auth,upload.single("image"),(req,res)=>{
  const id=Number(req.params.id);
  const old=db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if(!old) return res.status(404).json({error:"Product not found."});
  const {name,brand,description,price,stock,category,featured}=req.body;
  let image=old.image;
  if(req.file){
    image="/uploads/"+req.file.filename;
    if(old.image) {
      const oldPath=path.join(ROOT,old.image.replace(/^\/+/,""));
      if(fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }
  db.prepare(`UPDATE products SET name=?,brand=?,description=?,price=?,stock=?,category=?,image=?,featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name.trim(),(brand||"").trim(),(description||"").trim(),Number(price)||0,Number(stock)||0,category||"Everyday",image,featured==="1"?1:0,id);
  res.json({ok:true});
});

app.delete("/api/admin/products/:id",auth,(req,res)=>{
  const id=Number(req.params.id);
  const p=db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if(!p) return res.status(404).json({error:"Product not found."});
  db.prepare("DELETE FROM products WHERE id=?").run(id);
  if(p.image){
    const filePath=path.join(ROOT,p.image.replace(/^\/+/,""));
    if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ok:true});
});

app.get("/admin",(req,res)=>res.sendFile(path.join(ROOT,"public","admin.html")));

app.use((err,_req,res,_next)=>{
  res.status(400).json({error:err.message||"Something went wrong."});
});

app.listen(PORT,()=>console.log(`TechNova running at http://localhost:${PORT}`));
