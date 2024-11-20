document.getElementById("addTodo").addEventListener("click", async () => {
    const todoInput = document.getElementById("todoInput").value;
    const todoDate = document.getElementById("todoDate").value;

    if (!todoInput || !todoDate) {
        alert("Please enter a todo and a date");
        return;
    }

    try {
        console.log("Adding Todo:", { title: todoInput, date: todoDate });
        const response = await fetch("http://localhost:3000/todos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: todoInput, date: todoDate }),
            credentials: "include",
        });

        if (response.ok) {
            const newTodo = await response.json();
            console.log("Added Todo Response:", newTodo);
            alert("Todo added successfully");
            location.reload();
        } else {
            const error = await response.json();
            console.error("Error Adding Todo:", error);
            alert(`Error adding todo: ${error.error}`);
        }
    } catch (err) {
        console.error("Error in Add Todo API call:", err);
    }
});

document.getElementById("searchTodo").addEventListener("click", async () => {
    const query = document.getElementById("searchInput").value;

    try {
        console.log("Searching Todos with Query:", query);
        const response = await fetch(`http://localhost:3000/todos/search?q=${query}`, {
            credentials: "include",
        });

        const results = await response.json();
        console.log("Search Results:", results);

        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = ""; // Clear previous results

        results.forEach((todo) => {
            const todoItem = document.createElement("div");
            todoItem.textContent = `${todo.title} (Due: ${todo.date})`;
            resultsDiv.appendChild(todoItem);
        });
    } catch (err) {
        console.error("Error in Search Todos API call:", err);
    }
});
