const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Supabase client initialized');
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error.message);
    }
} else {
    console.log('No Supabase credentials found. Using local mock data fallback.');
}

// Mock Data Fallback
let mockLeaderboard = [
    { id: 1, player_name: 'Speedster', score: 1500, created_at: new Date().toISOString() },
    { id: 2, player_name: 'RacerX', score: 1200, created_at: new Date().toISOString() },
    { id: 3, player_name: 'DriftKing', score: 950, created_at: new Date().toISOString() }
];

// Routes

// Get top 10 scores
app.get('/api/scores', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('driving_leaderboard')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;
            return res.json(data);
        } catch (error) {
            console.error('Error fetching from Supabase:', error.message);
            console.log('Falling back to mock data due to error.');
            // Fallback to mock data on error
            const sortedMock = [...mockLeaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
            return res.json(sortedMock);
        }
    } else {
        const sortedMock = [...mockLeaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
        return res.json(sortedMock);
    }
});

// Submit a new score
app.post('/api/scores', async (req, res) => {
    const { player_name, score } = req.body;

    if (!player_name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const newScore = {
        player_name: player_name.substring(0, 20), // Max length 20
        score: Math.floor(score)
    };

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('driving_leaderboard')
                .insert([newScore])
                .select();

            if (error) throw error;
            return res.status(201).json(data[0]);
        } catch (error) {
            console.error('Error inserting into Supabase:', error.message);
             // Fallback to mock data on error
             const localScore = { ...newScore, id: Date.now(), created_at: new Date().toISOString() };
             mockLeaderboard.push(localScore);
             return res.status(201).json(localScore);
        }
    } else {
        const localScore = { ...newScore, id: Date.now(), created_at: new Date().toISOString() };
        mockLeaderboard.push(localScore);
        return res.status(201).json(localScore);
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
