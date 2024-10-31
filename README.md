# Enterprise LLM Application

A Next.js-based enterprise-grade Large Language Model (LLM) application that integrates with Snowflake for data storage and LLM capabilities.

## Features

- 🤖 Multiple LLM Model Support from Snowflake
- 🔍 Cortex Search - RAG (Retrieval Augmented Generation), Lexical Search and Reranking capabilities
- 💾 Snowflake integration for data persistence
- 📁 File upload support (PDF, CSV, XLSX, XLS)
- 💬 Real-time chat interface
- 🔒 Secure environment configuration

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Snowflake account with appropriate permissions
- Access to Snowflake LLM models

## Setup

1. **Clone the repository**   ```bash
   git clone <repository-url>
   cd enterprise-llm   ```

2. **Install dependencies**   ```bash
   npm install
   # or
   yarn install   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root directory with the following variables:   ```env
   SNOWFLAKE_ACCOUNT=your_account
   SNOWFLAKE_USER=your_username
   SNOWFLAKE_PASSWORD=your_password
   SNOWFLAKE_WAREHOUSE=your_warehouse
   SNOWFLAKE_DATABASE=your_database
   SNOWFLAKE_SCHEMA=your_schema
   SNOWFLAKE_ROLE=your_role
   SNOWFLAKE_PRIVATE_KEY="<key>"   ```

4. **Set up Snowflake tables**
   Ensure you have the following tables created in your Snowflake instance:
   - USERS (user_id, username, email)
   - CONVERSATIONS (conversation_id, user_id, title, model)
   - MESSAGES (message_id, conversation_id, role, content, token_count)

5. **Configure Snowflake stages**
   Set up the following stages in Snowflake:   ```sql
   CREATE STAGE LLM_API.CHAT.UNSTRUCTURED_UPLOAD;
   CREATE STAGE LLM_API.CHAT.STRUCTURED_UPLOAD;   ```

## Running the Application

1. **Development mode**   ```bash
   npm run dev
   # or
   yarn dev   ```

2. **Production build**   ```bash
   npm run build
   npm start
   # or
   yarn build
   yarn start   ```

### Chat Interface
- Select from multiple LLM models using the model selector
- Use suggested prompts or type your own questions - Currently placeholder
- Toggle RAG capabilities for enhanced responses
- View conversation history

### File Upload
- Support for multiple file formats (PDF, CSV, XLSX, XLS)
- Files are automatically stored in Snowflake stages
- Uploaded content can be used for RAG

### System Messages - Adding functionality later
- Customize system prompts
- Configure chat behavior

## Project Structure

- `/app` - Next.js application routes and layouts
- `/components` - React components
- `/lib` - Utility functions and services
- `/pages/api` - API routes for Snowflake integration
- `/public` - Static assets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license information here]

## Support

For support, please [create an issue](repository-issues-url) or contact [your-contact-info].