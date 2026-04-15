const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/authMiddleware');

// GET all conversations for the current user
// Derives conversations by grouping messages by (listing_id, user pair)
router.get('/', requireAuth, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const { rows } = await db.query(`
            SELECT DISTINCT ON (conv.listing_id, conv.other_user_id)
                conv.listing_id,
                conv.other_user_id,
                u.username AS other_username,
                l.car_year,
                l.car_make,
                l.car_model,
                l.item_photo,
                conv.latest_content,
                conv.latest_time
            FROM (
                SELECT
                    listing_id,
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
                    content AS latest_content,
                    created_at AS latest_time,
                    ROW_NUMBER() OVER (
                        PARTITION BY listing_id, 
                            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
                        ORDER BY created_at DESC
                    ) AS rn
                FROM messages
                WHERE sender_id = $1 OR receiver_id = $1
            ) conv
            JOIN users u ON u.id = conv.other_user_id
            LEFT JOIN listings l ON l.id = conv.listing_id
            WHERE conv.rn = 1
            ORDER BY conv.listing_id, conv.other_user_id, conv.latest_time DESC
        `, [userId]);

        // Convert item_photo to base64 for each conversation
        const conversationsWithImages = rows.map(conv => {
            if (conv.item_photo) {
                const base64Image = Buffer.from(conv.item_photo).toString('base64');
                return { ...conv, item_photo: `data:image/jpeg;base64,${base64Image}` };
            }
            return conv;
        });

        res.json(conversationsWithImages);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET all messages in a conversation between current user and another user about a listing
router.get('/:listingId/:otherUserId/messages', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const { listingId, otherUserId } = req.params;

    try {
        const { rows } = await db.query(`
            SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
                   u.username AS sender_username
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.listing_id = $1
              AND (
                  (m.sender_id = $2 AND m.receiver_id = $3)
                  OR (m.sender_id = $3 AND m.receiver_id = $2)
              )
            ORDER BY m.created_at ASC
        `, [listingId, userId, otherUserId]);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST — start a new conversation / send a first message
router.post('/', requireAuth, async (req, res) => {
    const buyerId = req.session.user.id;
    const { listing_id, message } = req.body;

    if (!listing_id || !message) {
        return res.status(400).json({ message: 'listing_id and message are required' });
    }

    try {
        // Look up listing owner
        const listingResult = await db.query(`SELECT user_id FROM listings WHERE id = $1`, [listing_id]);
        if (listingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        const sellerId = listingResult.rows[0].user_id;

        if (sellerId === buyerId) {
            return res.status(400).json({ message: 'Cannot message yourself' });
        }

        // Insert the first message
        const { rows } = await db.query(`
            INSERT INTO messages (sender_id, receiver_id, listing_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [buyerId, sellerId, listing_id, message]);

        res.status(201).json({
            message: 'Conversation started',
            data: rows[0],
            conversation: {
                listing_id: parseInt(listing_id),
                other_user_id: sellerId
            }
        });
    } catch (err) {
        console.error('Error creating conversation:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
