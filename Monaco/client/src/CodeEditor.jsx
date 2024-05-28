import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import "./CodeEditor.css";
import { useParams } from 'react-router-dom';
import { io } from "socket.io-client";

const SAVE_INTERVAL_MS = 2000;

export default function CodeEditor() {
    const [myEditor, setMyEditor] = useState(null);
    const [myEditorValue, setMyEditorValue] = useState(null);
    const [nameFile, setFileName] = useState("Untitled.txt");
    const [extFile, setFileExt] = useState("txt");
    const editorRef = useRef(null);
    const [socket, setSocket] = useState();
    const { id: codeId } = useParams();
    const fileRef = useRef();
  
    useEffect(() => {
        if (editorRef.current) {
            const monacoEditor = monaco.editor.create(editorRef.current, {
                value: 'Enter text',
                language: "javascript",
                theme: 'vs-dark',
            });
            setMyEditor(monacoEditor);

            // Cleanup function to dispose of the editor on component unmount
            return () => {
                if (monacoEditor) {
                    monacoEditor.dispose();
                }
            };
        }
    }, []);

    const changeFileName = (e) => {
        const newFileName = e.target.value;
        const ext = getFileExtension(newFileName);
        const lang = setDocLang(ext);
        const currentModel = myEditor.getModel();
        const newModel = monaco.editor.createModel(currentModel.getValue(), lang);

        setFileExt(ext);
        setFileName(newFileName);
        myEditor.setModel(newModel);
    };

    function getFileExtension(file) {
        if (typeof file !== 'string') {
            throw new TypeError('Expected a string');
        }
        
        const parts = file.split('.');
        return parts.length > 1 ? parts.pop() : ''; // Get the last part after the last dot or return empty string
    }

    const setDocLang = (fileExt) => {
        if (!fileExt) return "plaintext"; // Default to plaintext for empty or null extensions
        
        const extToLangMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cs': 'csharp',
            'java': 'java',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yml': 'yaml',
            'yaml': 'yaml',
            'php': 'php',
            'rb': 'ruby',
            'rs': 'rust',
            'go': 'go',
            'md': 'markdown',
            'sh': 'shell',
            'bat': 'bat',
            'pl': 'perl',
            'swift': 'swift',
            'r': 'r',
            'kt': 'kotlin',
            'sql': 'sql',
            'ini': 'ini',
            'toml': 'toml'
            // Add more file extensions and corresponding Monaco Editor languages as needed
        };
        return extToLangMap[fileExt] || 'plaintext'; // Default to plaintext if the extension is not found
    };

    useEffect(() => {
        const s = io("http://localhost:3001");
        setSocket(s);
        
        return () => {
            s.disconnect();
        };
    }, []);


    var isRemoteChange = false;
    useEffect(() => {
        if (!socket || !myEditor) return;

        const handleReceiveChanges = (delta) => {
            isRemoteChange = true;
            // console.log(delta)
            myEditor.setValue(delta.content)
            // setFileExt(delta.fileExt);
            // setFileName(delta.fileName);
            // fileRef.current.value = delta.fileName;

            if (delta.select) {
        const {
            selectionStartLineNumber, selectionStartColumn,
            endLineNumber, endColumn
        } = delta.select;

        console.log("Received selection data:", {
            selectionStartLineNumber,
            selectionStartColumn,
            endLineNumber,
            endColumn
        });

        const newSelection = new monaco.Selection(
            selectionStartLineNumber,
            selectionStartColumn,
            endLineNumber,
            endColumn
        );

        console.log("Applying selection:", newSelection);
        myEditor.setSelection(newSelection);
    }

            isRemoteChange = false;
        };

        // const handleReceiveChangesSelection = (delta) => {
        //     isRemoteChange = true;
        //     console.log(delta)
        //     // myEditor.setValue(delta.content)
        //     // setFileExt(delta.fileExt);
        //     // setFileName(delta.fileName);
        //     // fileRef.current.value = delta.fileName;
        //     isRemoteChange = false;

        // };

        // socket.on('receive-changes-selection',handleReceiveChanges)
        socket.on('receive-changes', handleReceiveChanges);

        myEditor.onDidChangeModelContent((event)=>{
            if (!isRemoteChange) {
                socket.emit("send-changes", {content:myEditor.getValue(),select:myEditor.getSelection()});
            }
        })
        myEditor.onDidChangeCursorSelection((event)=>{
            if (!isRemoteChange) {
                socket.emit("send-changes", {content:myEditor.getValue(),select:myEditor.getSelection()});
            }
        })
        
        return () => {
            socket.off('receive-changes', handleReceiveChanges);
            socket.off('receive-changes', handleReceiveChanges);
        };
    }, [myEditor, socket]);

    // useEffect(() => {
    //     if (!socket || !myEditor) return;

    //     // const interval = setInterval(() => {
    //     //     const data = {
    //     //         fileName: fileRef.current.value,
    //     //         fileExt: extFile,
    //     //         text: myEditor.getValue(),
    //     //         pos: myEditor.getPosition()
    //     //     };
    //     //     socket.emit("send-changes", data);
    //     // }, 3000);

    // myEditor.onDidChangeModelContent((event)=>{
    //     socket.emit("send-changes", event);
    // })
        
    //     return () => {
    //         clearInterval(interval);
    //     };
    // }, [socket, myEditor]);

    useEffect(() => {
        if (!socket || !myEditor) return;

        const handleLoadDocument = (doc) => {
            myEditor.setValue(doc.content);
            // myEditor.setPosition(doc.pos);
            // setFileExt(doc.fileExt);
            setFileName(doc.fileName);
            fileRef.current.value = doc.fileName;
        };

        socket.on("load-document", handleLoadDocument);
        socket.emit("get-document", codeId);
        // console.log(codeId)

        return () => {
            socket.off('load-document', handleLoadDocument);
        };
    }, [socket, myEditor, codeId]);

    useEffect(()=>{
        if (socket == null || myEditor == null) return
        
        const interval = setInterval(() => {
            let data = {content:myEditor.getValue(),fileName:fileRef.current.value}
            // console.log(data)
            socket.emit("save-document",data)
        }, SAVE_INTERVAL_MS);
        
        
        return ()=>{
            clearInterval(interval)
        }
    },[socket,myEditor])

    return (
        <>
            <label htmlFor="fileName" style={{ color: "#EEEEEE" }}>Enter Name of the file: </label>
            <input
                type="text"
                ref={fileRef}
                value={nameFile}
                onChange={changeFileName}
                id="fileName"
                name="fileName"
            />
            <div className="container" id="container" ref={editorRef}></div>
        </>
    );
}
