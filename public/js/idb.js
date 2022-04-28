let db; // create variable to hold db connection
const request = indexedDB.open('my_budget', 1); // establish a connection to IndexedDB database called 'my_budget' & set it to version 1


// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
    const db = event.target.result; // save a reference to the database 
    db.createObjectStore('new_budget', { autoIncrement: true }); // create an object store (table) called `new_budget`, set it to have an auto incrementing primary key of sorts 
};


request.onsuccess = function (event) {
    // when db is successfully created with its object store (from onupgradedneeded event above), save reference to db in global variable
    db = event.target.result;

    // check if app is online, if yes run checkDatabase() function to send all local db data to api
    if (navigator.onLine) {
        uploadBudget();
    }
};



request.onerror = function (event) {
    // log error here
    console.log(event.target.errorCode);
};


// This function will be executed if we attempt to submit a new pizza and there's no internet connection
function saveRecord(record) {
    const transaction = db.transaction(['new_budget'], 'readwrite'); // open a new transaction with the database with read and write permissions 
    const budgetObjectStore = transaction.objectStore('new_budget'); // access the object store for `new_budget`
    budgetObjectStore.add(record); // add record to your store with add method.
}

function uploadBudget() {
    const transaction = db.transaction(['new_budget'], 'readwrite'); // open a transaction on your pending db
    const budgetObjectStore = transaction.objectStore('new_budget'); // access your pending object store
    const getAll = budgetObjectStore.getAll(); // get all records from store and set to a variable

    getAll.onsuccess = function () {
        // if there was data in indexedDb's store, let's send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }
                    const transaction = db.transaction(['new_budget'], 'readwrite');
                    const budgetObjectStore = transaction.objectStore('new_budget');
                    budgetObjectStore.clear(); // clear all items in your store
                })
                .catch(err => {
                    // set reference to redirect back here
                    console.log(err);
                });
        }
    };
}

// listen for app coming back online
window.addEventListener('online', uploadBudget);
