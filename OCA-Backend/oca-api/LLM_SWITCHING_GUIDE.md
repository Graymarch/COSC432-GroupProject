# Switching Between Local and Cloud Ollama

This guide explains how to switch between **local Ollama** (localhost) and **cloud Ollama** (ollama.com API).

## Current Setup: Local Ollama

The current implementation uses **Ollama running locally**:
- ✅ No API costs
- ✅ Privacy: All processing stays local
- ✅ No internet required (after model download)
- ⚠️ Requires local GPU/CPU resources
- ⚠️ Model must be downloaded locally

**Configuration:**
```javascript
// config/ollama.js
const ollama = new Ollama({
  host: 'http://localhost:11434'  // Local
});
```

## Switching to Cloud Ollama (ollama.com)

Cloud Ollama uses Ollama's hosted API service:
- ✅ No local resources needed
- ✅ Access to more models
- ⚠️ Requires internet connection
- ⚠️ API costs (pay per use)
- ⚠️ Data sent to cloud (privacy consideration)

### Step 1: Get Ollama Cloud API Key

1. Go to https://ollama.com
2. Sign up or log in
3. Navigate to API settings
4. Generate an API key
5. Copy the API key (starts with something like `ollama-...`)

### Step 2: Update Ollama Configuration

Update `config/ollama.js`:

```javascript
const { Ollama } = require('ollama');

// Check if using cloud or local
const isCloud = process.env.OLLAMA_HOST === 'https://ollama.com' || 
                process.env.OLLAMA_USE_CLOUD === 'true';

const ollamaConfig = {
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
};

// Add API key header if using cloud
if (isCloud && process.env.OLLAMA_API_KEY) {
  ollamaConfig.headers = {
    Authorization: 'Bearer ' + process.env.OLLAMA_API_KEY
  };
}

const ollama = new Ollama(ollamaConfig);

module.exports = ollama;
```

### Step 3: Update Environment Variables

In your `.env` file:

**For Cloud Ollama:**
```env
# Cloud Ollama Configuration
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=your_ollama_api_key_here
OLLAMA_MODEL=llama3  # or any model available on cloud
OLLAMA_USE_CLOUD=true  # Optional flag
```

**For Local Ollama (current):**
```env
# Local Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
# OLLAMA_API_KEY not needed for local
```

### Step 4: Restart Backend

```bash
npm start
```

The backend will automatically use cloud or local based on your `.env` configuration.

## Quick Comparison

| Feature | Local Ollama | Cloud Ollama |
|---------|-------------|--------------|
| **Host** | `http://localhost:11434` | `https://ollama.com` |
| **API Key** | Not required | Required |
| **Setup** | Install Ollama locally | Just need API key |
| **Cost** | Free | Pay per use |
| **Privacy** | ✅ Fully local | ⚠️ Data sent to cloud |
| **Internet** | Not required | Required |
| **Models** | Must download locally | Access to all cloud models |
| **Performance** | Depends on local hardware | Cloud infrastructure |

## Code Changes Summary

The **only changes needed** are:

1. **`config/ollama.js`** - Add API key header support
2. **`.env`** - Change `OLLAMA_HOST` and add `OLLAMA_API_KEY`

**No other code changes needed!** The rest of your codebase (services, routes) works the same way.

## Environment Variable Reference

### Local Ollama
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
# OLLAMA_API_KEY not needed
```

### Cloud Ollama
```env
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=ollama-your-api-key-here
OLLAMA_MODEL=llama3
OLLAMA_USE_CLOUD=true  # Optional
```

## Switching Checklist

To switch from Local → Cloud:

- [ ] Get Ollama Cloud API key from ollama.com
- [ ] Update `config/ollama.js` to support API key headers
- [ ] Update `.env`: Change `OLLAMA_HOST` to `https://ollama.com`
- [ ] Add `OLLAMA_API_KEY` to `.env`
- [ ] Restart backend server
- [ ] Test with `/api/chat` endpoint

To switch from Cloud → Local:

- [ ] Ensure Ollama is installed locally
- [ ] Run `ollama serve` (or ensure it's running)
- [ ] Pull model: `ollama pull llama3`
- [ ] Update `.env`: Change `OLLAMA_HOST` to `http://localhost:11434`
- [ ] Remove or comment out `OLLAMA_API_KEY` in `.env`
- [ ] Restart backend server
- [ ] Test with `/api/chat` endpoint

## Important Notes

### Privacy Considerations

⚠️ **Cloud Ollama**: When using cloud Ollama, your prompts, course material context, and student questions are sent to Ollama's cloud servers. This may violate your "no cloud uploads" requirement for copyrighted course materials.

✅ **Local Ollama**: All processing stays on your machine, maintaining full privacy.

### Model Availability

- **Local**: You must download models with `ollama pull <model>`
- **Cloud**: Access to all models available on ollama.com without downloading

### Cost Considerations

- **Local**: Free (just electricity)
- **Cloud**: Pay-per-use pricing (check ollama.com for current rates)

### Embeddings

Both local and cloud Ollama support embeddings. The same embedding models work with both:
- `nomic-embed-text`
- `all-minilm-l6-v2`

No changes needed to embedding code when switching.

## Troubleshooting

### Cloud Ollama Issues

**Error: "Invalid API key"**
- Verify `OLLAMA_API_KEY` is correct in `.env`
- Check that API key hasn't expired
- Ensure no extra spaces in `.env` file

**Error: "Connection refused"**
- Verify `OLLAMA_HOST=https://ollama.com` (with `https://`)
- Check internet connection
- Verify Ollama cloud service is available

**Error: "Model not found"**
- Some models may only be available locally or cloud
- Check model availability on ollama.com
- Try a different model name

### Local Ollama Issues

**Error: "Connection refused"**
- Ensure `ollama serve` is running
- Check `OLLAMA_HOST=http://localhost:11434`
- Verify Ollama is installed correctly

**Error: "Model not found"**
- Run `ollama pull <model-name>` to download
- Check available models: `ollama list`

## Recommended Configuration

For your use case (privacy + local processing):

✅ **Use Local Ollama** for:
- Course material processing
- Embedding generation
- Privacy-sensitive operations

⚠️ **Consider Cloud Ollama** for:
- Testing different models
- When local hardware is limited
- Development/testing environments

---

**Note**: The original `routes/model.js` file used cloud Ollama. The current skeleton uses local Ollama by default. This guide helps you switch between them easily.
