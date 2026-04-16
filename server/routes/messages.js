const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', requireAuth, async (req, res) => {
    const senderId = req.session.user.id;
    const { receiver_id, listing_id, content } = req.body;

    if ( !receiver_id || !listing_id || !content ) {
        return res.status(400).json({message:"receiver_id, listing_id, and content are required"});
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO messages (sender_id, receiver_id, listing_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [senderId, receiver_id, listing_id, content]);

        const userName = await db.query(`SELECT username FROM users WHERE id = $1`, [senderId]);

        res.status(201).json({
            ...rows[0],
            sender_username: userName.rows[0].username
        })
    } catch (err) {
      console.error('Error saving message', err)
      res.status(500).json({error:'server error'});
    }

});

module.exports = router;