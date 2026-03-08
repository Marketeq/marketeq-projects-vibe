# **Hey API -- Setup Guide**

This document explains how to set up **Hey API** in a project from
scratch. It is divided into three clear sections:

1.  Installing the library

2.  Configuring Hey API using a configuration file

3.  Configuring plugins

## **1. Installing the Library**

Hey API is commonly used as a **code generator for OpenAPI
specifications**, producing clean and type-safe API clients.

### **Prerequisites**

Before installing, make sure you have:

- **Node.js** (v18 or later recommended)

- **npm**, **pnpm**, or **yarn**

- An **OpenAPI spec** file (openapi.json or openapi.yaml)

### **Installation**

Install Hey API as a development dependency:

npm install -D \@hey-api/openapi-ts



After installation, you should be able to run the generator using:

npx openapi-ts



## **2. Configuring the Library (Configuration File)**

Hey API is configured using a **config file**, usually named:

openapi-ts.config.ts

This file tells Hey API:

- Where your OpenAPI spec lives

- Where to generate the API client

- Which runtime and output style to use

### **Basic Configuration Example**

Create a file called openapi-ts.config.ts in your project root:

import { defineConfig } from \'@hey-api/openapi-ts\';

export default defineConfig({

input: \'./openapi.json\',

output: \'./src/api\',

client: \'fetch\',

});



### **Explanation (Plain English)**

- **input** → Path to your OpenAPI file

- **output** → Folder where generated code will live

- **client** → HTTP client to use (fetch, axios, etc.)

### **Generating the API Client**

Once configured, generate the client:

npx openapi-ts

You will now see generated API files inside src/api.

## **3. Configuring Plugins**

Plugins allow you to **extend or customize** how Hey API generates code.

Examples of what plugins can do:

- Generate schemas only

- Customize naming conventions

- Add runtime helpers

- Modify output structure

### **Plugin Configuration Example**

Plugins are added directly inside the config file:

import { defineConfig } from \'@hey-api/openapi-ts\';

export default defineConfig({

input: \'./openapi.json\',

output: \'./src/api\',

client: \'fetch\',

plugins: \[

{

name: \'schemas\',

},

{

name: \'services\',

},

\],

});



### **What's Happening Here**

- **plugins** → An array of plugin configurations

- Each plugin is enabled by its **name**

- Plugins can usually be combined safely

### **Plugin With Options (Example)**

Some plugins accept options:

plugins: \[

{

name: \'services\',

output: \'./src/services\',

},

\];



This lets you control **where** and **how** code is generated.

## **Summary**

- Install Hey API as a dev dependency

- Create a single config file to control generation

- Enable plugins to customize output

Once set up, Hey API can be re-run anytime to regenerate your API client
as your OpenAPI spec evolves.

This setup works well for beginners and scales cleanly for large
projects.
