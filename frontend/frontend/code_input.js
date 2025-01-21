const executeCode = async (code, language) => {
    const response = await fetch("http://localhost:8000/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language }),
    });
    const result = await response.json();
    console.log(result); // Display results in the frontend
  };
  