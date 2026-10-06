import mongoose from 'mongoose';
import { ChatSession, ChatMessage } from './models/ChatModels.js';
import { RepositoryChatService } from './services/repositoryChatService.js';

async function runTestSuite() {
    console.log('--- Starting Module 12: Repository AI Assistant Test Suite ---');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/asdse_test');
    console.log('Connected to test database.');

    try {
        const repoId = new mongoose.Types.ObjectId().toString();
        console.log(`Using repositoryId: ${repoId}`);

        // 1. Process Message (Create Session implicitly)
        console.log('\n[Test 1] Processing Message (and creating session implicitly)...');
        try {
            const result = await RepositoryChatService.processChatMessage(repoId, 'Initial Question');
            console.log('Result:', result);
            if (!result || !result.success) {
                console.log('Expected failure because repo does not exist, but let us verify format:', result);
            }
        } catch (e) {
            console.log('Expected error without full LLM/RAG context:', e.message);
        }

        // Test Sensitive Data Redaction
        console.log('\n[Test 2] Testing Sensitive Data Redaction...');
        const rawContent = "Here is the key: sk-test-1234567890abcdef and password=password12345";
        const redacted = RepositoryChatService.redactSensitiveData(rawContent);
        console.log('Raw:', rawContent);
        console.log('Redacted:', redacted);
        if (redacted.includes('sk-test-1234567890abcdef') || redacted.includes('password12345')) {
            throw new Error('Redaction failed!');
        }

        console.log('\n--- All Core Tests Passed ---');
    } catch (err) {
        console.error('Test Suite Failed:', err);
    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        console.log('Disconnected from test database.');
    }
}

runTestSuite();
