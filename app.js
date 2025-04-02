const express= require('express');
const app=express();
const userModel=require('./models/user');
const postModel=require('./models/post');
const cookieParser= require('cookie-parser');
const bcrypt= require('bcrypt');
const jwt=require('jsonwebtoken');
const path=require('path');
const upload = require('./config/multerconfig');

app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());
//middleware route protection
function isLoggedIn(req,res,next){
    if(req.cookies.token==='')res.redirect('/login');
    else{
      let data=  jwt.verify(req.cookies.token,"shhh");
      req.user=data;
    }
    next();
}


app.get('/',(req,res)=>{
 res.render('index');
});

app.get('/profile/upload', isLoggedIn, (req, res) => {
  res.render('profileupload');
});

app.post('/upload',isLoggedIn,upload.single('image'),async (req, res) => {
   let user= await userModel.findOne({email:req.user.email});
   user.profilepicture=req.file.filename;
   await user.save();
   res.redirect('profile');
});


app.post('/register', async (req,res)=>{
    let {email,username,password,name,age}=req.body;
  let user=await userModel.findOne({email:email});
  if(user)return res.status(500).send('user already registered');

  bcrypt.genSalt(10,(err,salt)=>{
    bcrypt.hash(password,salt, async (err,hash)=>{
      let user=await  userModel.create({
            username,
            name,
            age,
            email,
            password:hash
        });
      let token= jwt.sign({email:email,userid:user._id},"shhh");
      res.cookie("token",token);
      res.redirect("/login");
      console.log(token);

    })
  })


});

app.get('/login',(req,res)=>{
 res.render('login');
});
//when i am logged in, and i need user details i will use req.user (see the details associated with jwt token)
app.get('/like/:postid',isLoggedIn,async (req,res)=>{
  let post= await postModel.findOne({_id:req.params.postid}).populate('user');

  if(post.likes.indexOf(req.user.userid)===-1)
  {
    post.likes.push(req.user.userid);
    
  }
  else{
   post.likes.splice(post.likes.indexOf(req.user.userid),1)
  }
  await post.save();
  
  res.redirect('/profile');
})

app.post('/login', async (req,res)=>{
    let {email,password}=req.body;
    let user=await userModel.findOne({email:email});
    if(!user)return res.status(500).send('Something went wrong!');

   bcrypt.compare(password,user.password,(err,result)=>{
    if(result){
       
        let token= jwt.sign({email:email,userid:user._id},"shhh");
        res.cookie("token",token);
        
        res.redirect('/profile')
    }
    else res.redirect('/login');
   })

   });

app.get('/logout',(req,res)=>{
    res.cookie("token","");
    res.redirect('/login');
})

app.get('/profile',isLoggedIn,async (req,res)=>{
  let user=await userModel.findOne({email:req.user.email}).populate('posts');
      res.render('profile',{user});
})

app.post('/post',isLoggedIn,async (req,res)=>{
  let user=await userModel.findOne({email:req.user.email});
  let post=await  postModel.create(
      {
        user:user._id,
        content:req.body.content
      }
    )
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
})

app.get('/edit/:postid',isLoggedIn,async (req,res)=>{
  let post=await postModel.findOne({_id:req.params.postid});
  res.render('edit.ejs',{post});


})

app.post('/edit/:postid',isLoggedIn,async (req,res)=>{

  let post=await postModel.findOneAndUpdate({_id:req.params.postid},{content:req.body.content});
  
  res.redirect("/profile");


})

app.get('/posts',isLoggedIn,async (req,res)=>{
  let posts = await postModel.find().populate('user');
  res.render('allpost',{posts});

})

app.listen(3000);