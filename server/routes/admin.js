import { Router } from 'express';
import {
  getGameData,
  resetGame,
  updateTeams,
  updateScores,
  lockAndRandomize,
  markQuarterWinner
} from '../services/dataService.js';

const router = Router();

// POST /api/admin/reset - Reset game to initial state
router.post('/reset', (req, res) => {
  try {
    const data = resetGame();
    res.json({ message: 'Game reset successfully', data });
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/teams - Update team information
router.post('/teams', (req, res) => {
  try {
    const { homeTeam, awayTeam } = req.body;

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'homeTeam and awayTeam required' });
    }

    const data = updateTeams(homeTeam, awayTeam);
    res.json({ message: 'Teams updated', data });
  } catch (error) {
    console.error('Error updating teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/scores - Update current scores
router.post('/scores', (req, res) => {
  try {
    const { homeScore, awayScore } = req.body;

    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: 'homeScore and awayScore required' });
    }

    const data = updateScores(parseInt(homeScore), parseInt(awayScore));
    res.json({ message: 'Scores updated', data });
  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/lock - Lock grid and randomize numbers
router.post('/lock', (req, res) => {
  try {
    const data = lockAndRandomize();
    res.json({ message: 'Grid locked and numbers randomized', data });
  } catch (error) {
    console.error('Error locking grid:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/admin/quarter - Mark a quarter as complete
router.post('/quarter', (req, res) => {
  try {
    const { quarter } = req.body;

    if (!quarter || !['q1', 'q2', 'q3', 'q4'].includes(quarter)) {
      return res.status(400).json({ error: 'Valid quarter (q1, q2, q3, q4) required' });
    }

    const data = markQuarterWinner(quarter);
    res.json({ message: `Quarter ${quarter} marked complete`, data });
  } catch (error) {
    console.error('Error marking quarter:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
