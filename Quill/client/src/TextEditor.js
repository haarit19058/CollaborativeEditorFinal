import React, { useCallback, useEffect, useRef,useState } from 'react'
import Quill from "quill"
import "quill/dist/quill.snow.css"
import "./style.css"
import { io}  from "socket.io-client"
import { useParams } from 'react-router-dom'


const TOOLBAR_OPTIONS = [
    [{header:[1,2,3,4,5,6,false]}],
    [{font:[]}],
    [{list:"ordered"},{list:"bullet"}],
    ["bold","italic","underline"],
    [{color:[]},{background:[]}],
    [{script:"sub"},{script:"super"}],
    [{align:[]}],
    ["image","blockquote","code-block"],
    ["clean"], 
]

const SAVE_INTERVAL_MS = 1000


export default function TextEditor() {
    // const wrapperRef = useRef()
    
    const {id: documentId} = useParams()
    // console.log(documentId)
    const [socket,setSocket] = useState()
    const [quill,setQuill] = useState()
    const [nameFile, setFileName] = useState("Untitled.txt");
    const [extFile, setFileExt] = useState("txt");
    const fileRef = useRef();


    const changeFileName = (e) => {
        const newFileName = e.target.value;
        // console.log(newFileName)
        // fileRef.current.value = newFileName
        const ext = getFileExtension(newFileName);
        setFileName(newFileName)
        setFileExt(ext)
    };

    function getFileExtension(file) {
        if (typeof file !== 'string') {
            throw new TypeError('Expected a string');
        }
        
        const parts = file.split('.');
        return parts.length > 1 ? parts.pop() : ''; // Get the last part after the last dot or return empty string
    }
        

    useEffect(()=>{
        let s= io("http://localhost:3001")
        setSocket(s)
        
        return ()=>{
            s.disconnect()
        }
    },[])
    
    
    
    useEffect(()=>{
        if (socket == null || quill == null) return



        const handleLoadDocument = (document) => {
            // console.log('inside load-document');
            // console.log(document)
            quill.setText(document.content);
            setFileName(document.fileName)
            fileRef.current.value = document.fileName;
            quill.enable();
        };
        socket.on("load-document",handleLoadDocument)
        socket.emit("get-document",documentId)
        
        return () => {
            socket.off('load-document', handleLoadDocument);
        };
    },[socket,quill,documentId])
    
    
    useEffect(()=>{
        if (socket == null || quill == null) return
        
        const interval = setInterval(() => {
            var delta = quill.getContents();

            // Extract text from Delta
            var text = delta.reduce(function(prev, curr) {
            if (typeof curr.insert === 'string') {
                return prev + curr.insert;
            } else {
                return prev;
            }
            }, '');
            let data = {content:text,fileName:fileRef.current.value}
            // console.log(data)
            socket.emit("save-document",data)
        }, SAVE_INTERVAL_MS);
        
        
        return ()=>{
            clearInterval(interval)
        }
    },[socket,quill])
    


    useEffect(()=>{
        if (socket == null || quill == null) return
        const handler = (delta)=>{
            quill.updateContents(delta.content)
            quill.setSelection(delta.select)
            fileRef.current.value = delta.fileName
            setFileName(delta.fileName)
        }

        // const handler1 = (delta)=>{
            // console.log("receiving-selection",delta)
        //     quill.setSelection(delta)
        // }
        
        socket.on('receive-changes',handler)
        // socket.on('receive-changes-selection',handler1)
        
        return ()=>{
            // quill.off('text-change',handler)
            socket.off('receive-changes',handler)
            // socket.off('receive-changes-selection',handler1)
        }
    },[socket,quill])




    useEffect(()=>{
        if (socket == null || quill == null) return

        const handler = (delta,olddelta,source)=>{
            if (source!=="user") return
            let data = {content:delta,select:quill.getSelection(),fileName:fileRef.current.value}
            socket.emit("send-changes",data)
        }
        
        // const handler1 = (delta,olddelta,source)=>{
        //     if (source!=="user") return
        //     let data = quill.getSelection()
            // console.log(delta,"sending selection")
        //     socket.emit("send-changes-selection",delta)
        // }

        quill.on("text-change",handler)
        quill.on("selection-change",handler)
        return ()=>{
            socket.off('receive-changes',handler)
        }
    },[socket,quill])



    let wrapperRef = useCallback((wrapper)=>{
        if (wrapper == null) return
        wrapper.innerHTML=""
        const editor = document.createElement('div')
        wrapper.append(editor)
        const q = new Quill(editor,{theme:'snow',modules:{toolbar:TOOLBAR_OPTIONS}})
        
        q.disable()
        q.setText("Loading...")
        setQuill(q)
        // return ()=>{
        //     wrapperRef.innerHTML = ""
        // }
    },[])


  return (
    <>
    <label htmlFor="fileName">Enter Name of the file: </label>
            <input
                type="text"
                ref={fileRef}
                value={nameFile}
                onChange={changeFileName}
                id="fileName"
                name="fileName"
            />
    <div id = "container" className="container" ref={wrapperRef}>
    </div>
    </>
    
  )
}
