# UI Tool Server API Documentation

## Introduction

This document provides instructions for interacting with the UI Tool Server API. The API allows external services to dynamically discover and register new UI tools. These "tools" are React components that can be rendered in a host application, such as a chatbot interface or a dynamic dashboard.

The server is designed for hot-reloading, meaning that once a tool is registered via the API, it becomes immediately available without needing a server restart.

**Base URL**: The server is configured to always run on `http://localhost:4000`. All API endpoints are relative to this base URL.

---

## Endpoints

### 1. List Available Tools

Retrieves a list of all currently registered UI tools. The server discovers tools by scanning its `/pages` directory for valid React component files and extracting a description from a comment at the top of each file.

- **URL**: `/api/ui-register`
- **Method**: `GET`
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**: An array of tool objects. Each object contains the tool's name (derived from the filename) and its description.
  
  **Example (when tools are registered):**
  ```json
  [
    {
      "name": "UserProfileCard",
      "description": "A card component to display user profile information."
    },
    {
      "name": "SystemStatusIndicator",
      "description": "A component to show the current system status."
    }
  ]
  ```

  **Example (when no tools are available):**
  ```json
  []
  ```
- **Usage (cURL)**:
  ```bash
  curl http://localhost:4000/api/ui-register
  ```

---

### 2. Register a New Tool

Dynamically registers a new UI tool by creating a new `.tsx` file in the server's `/pages` directory.

- **URL**: `/api/ui-register`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
- **Request Body**: A JSON object containing the name for the new tool and its content (the React component code).

  - `name` (string, required): The name of the tool. This will be used as the filename (e.g., "MyNewTool" becomes `MyNewTool.tsx`). **It must be a valid filename and should not include the file extension.**
  - `content` (string, required): The full string content of the `.tsx` file for the React component. **The first line must be a comment (`//`) containing the tool's description.**

  **Example Request Body:**
  ```json
  {
    "name": "HelloWorld",
    "content": "// A simple component that displays a greeting.\nimport React from 'react';\n\nexport default function HelloWorld() {\n  return <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>Hello, World!</div>;\n}"
  }
  ```

- **Success Response**:
  - **Code**: `201 Created`
  - **Content**: A JSON object confirming the successful registration.
  
  **Example:**
  ```json
  {
    "message": "Tool HelloWorld registered successfully"
  }
  ```
- **Error Responses**:
  - **Code**: `400 Bad Request`
    - If `name` or `content` is missing from the request body.
    - If the first line of the `content` is not a comment for the description.
  
  **Example:**
  ```json
  {
    "error": "Tool name and content are required"
  }
  ```

- **Previewing and Editing Tools**:
  - **Previewing**: Once a tool is successfully registered, it is immediately available at a dedicated URL. The path for the URL is the `name` provided during registration. For example, if a tool is registered with the name `HelloWorld`, it can be previewed directly in a browser at `http://localhost:4000/HelloWorld`.
  - **Editing**: The API does not currently support in-place editing of a tool. To "edit" a tool, you must register it again using the same `name` but with the updated `content`. The server will overwrite the existing tool file with the new version.

- **Usage (cURL)**:
  ```bash
  curl -X POST http://localhost:4000/api/ui-register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HelloWorld",
    "content": "// A simple component that displays a greeting.\nimport React from \"react\";\n\nexport default function HelloWorld() {\n  return <div style={{ padding: \"20px\", border: \"1px solid #ccc\", borderRadius: \"8px\" }}>Hello, World!</div>;\n}"
  }'
  ```

</rewritten_file> 