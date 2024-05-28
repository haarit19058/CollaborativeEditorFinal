const express = require("express")
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose")
const CodeFile = require("./Code.js");

mongoose.connect('mongodb://localhost/google-docs-clone')
.then(()=>{
    console.log("connected to db")
})

const app = express()

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


        socket.on('send-changes',delta=>{
            socket.broadcast.to(documentId).emit("receive-changes",delta)
        })

        socket.on('save-document',async data =>{
            await CodeFile.findByIdAndUpdate(documentId,{data})
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

app.get("/",(req,res)=>{
    res.sendFile("./home.html");
})

app.listen(5000,()=>{
    console.log("Server is listening")
})