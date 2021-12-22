# NATS POC

### Prerequisites
Node >= 8

### Starting ERA client (Connection Manager)

1. Navigate to era-nats-client-js folder
2. Run the command : **npm install -d**
3. Run the command : **npm start**

The client will be started on port 7000

### Starting DBServer Client

1. Navigate to dbserver-nats-client-js folder
2. Run the command : **npm install -d**
3. Run the command : **npm start -- --command_subject clientA_command --request_subject clientA_request --reply_subject clientA_reply**

The client will be started on port 8000

### Testing

Import the postman_collection.json into postman and run the API's in the following order

1. Create subscriber on ERA
2. Add Reply subject on ERA 
3. Add Stream on ERA // If stream already exits, error is thrown
4. Add Durable Customer on ERA // Change body with streamName created in 3rd
5. Create Pull Consumer on ERA // Change body with subject from 3rd and and name from 4th

The above requests will initiate the messaging design proposed.

Command subject Testing: Run "Reply Request from ERA"
Request subject Testing: Run "API Request from DBServer"
Operation subject Testing: Run "Publish Stream on ERA" // Monitor the terminal where dbserver client was started. It will fetch message 1 message every 2 seconds
