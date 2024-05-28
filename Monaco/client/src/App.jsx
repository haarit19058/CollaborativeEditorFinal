import CodeEditor from "./CodeEditor"
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect
}
from 'react-router-dom'
import {v4 as uuidv4} from 'uuid'




function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
        <Redirect to={`/documents/${uuidv4()}/Monaco`}></Redirect>
        </Route>
        <Route path="/documents/:id/Monaco" element = {<CodeEditor/>}>
        <CodeEditor/>
        </Route>
      </Switch>
    </Router>
  )
}

export default App

