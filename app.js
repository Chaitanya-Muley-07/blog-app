const express= require('express');
const app=express();
const userModel=require('./models/user');
const postModel=require('./models/post');
const cookieParser= require('cookie-parser');
const bcrypt= require('bcrypt');
const jwt=require('jsonwebtoken')

app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
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
      res.send("registered user successfully");
      console.log(token);

    })
  })


});

app.get('/login',(req,res)=>{
 res.render('login');
});

app.post('/login', async (req,res)=>{
    let {email,password}=req.body;
    let user=await userModel.findOne({email:email});
    if(!user)return res.status(500).send('Something went wrong!');

   bcrypt.compare(password,user.password,(err,result)=>{
    if(result){
       
        let token= jwt.sign({email:email,userid:user._id},"shhh");
        res.cookie("token",token);
        console.log(user);
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


app.listen(3000);