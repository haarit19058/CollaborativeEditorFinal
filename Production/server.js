const express = require("express")
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose")
const CodeFile = require("./Code.js");
const path = require("path")
const serveStatic = require('serve-static');
const uuid = require('uuid')
const app = express()

const ejsmate = require("ejs-mate")
app.engine("ejs",ejsmate)

app.set("view engine", "ejs")
app.set("views", path.join(__dirname,"views"))

mongoose.connect('mongodb://localhost/google-docs-clone')
.then(()=>{
    console.log("connected to db")
})


app.use(serveStatic(path.join(__dirname, 'build')))
app.use(bodyParser.json());
app.use(cors());


const io = require('socket.io')(3001,{
    cors:{
        origin:'*',
        methods:["GET","POST"]
    },
})

io.on("connection",socket =>{
    console.log("connected")
    
    socket.on("get-document",async documentId =>{
        const document = await findOrCreateDocument(documentId)
        socket.join(documentId)
        
        socket.emit("load-document",document.data)
        
        socket.on('save-document',async data =>{
            await CodeFile.findByIdAndUpdate(documentId,{data})
        })
        socket.on('send-changes',delta=>{
            // console.log(delta)
            socket.broadcast.to(documentId).emit("receive-changes",delta)
        })
    })
})

let defaultData = {
    fileName:"Untitled.txt",
    fileExt:"txt",
    text:"Type Something"
}


async function findOrCreateDocument(id){
    if (id == null) return
    const document = await CodeFile.findById(id)
    if (document) return document
    
    return await CodeFile.create({_id:id,data:defaultData})
}

app.get("/",async (req,res)=>{
    let datas = await CodeFile.find({})
    res.render("home.ejs",{datas})
})

app.get("/deleteItem/:id",async (req,res)=>{
    let {id} = req.params
    console.log(id)
    await CodeFile.deleteOne({_id:id})
    res.redirect("/")
})


app.get("/createNew",(req,res)=>{
    res.redirect(`/documents/${uuid.v4()}/Monaco`)
})

app.get("/documents/:id/Monaco",(req,res)=>{
    res.sendFile(path.join(__dirname,"build","index_monaco.html"))
})

app.get("/documents/:id/Quill",(req,res)=>{
    res.sendFile(path.join(__dirname,"build","index_quill.html"))
})

app.listen(5000,()=>{
    console.log("Server is listening")
})