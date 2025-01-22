import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        axios.get("http://localhost:8000/api/v1/test").then((response) => {
            setMessage(response.data.message);
        });
    }, []);

    return <div>{message}</div>;
}

export default App;
