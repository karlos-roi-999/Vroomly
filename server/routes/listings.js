const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


// LOAD ALL listings from PostgreSQL
router.get("/", async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT * FROM listings`);

        const listingsWithImages = rows.map(listing => {
            if(listing.item_photo){
                const base64Image = listing.item_photo.toString('base64');

                return {
                    ...listing,
                    item_photo: `data:image/jpg;base64,${base64Image}`
                    }
                }
                return listing;
        });
        res.json(listingsWithImages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET listings by id
router.get('/:id', async (req, res) => {
    try{    
        const listingId = parseInt(req.params.id);

        const { rows } = await db.query(
            `SELECT l.*, u.username AS seller_username
             FROM listings l
             JOIN users u ON u.id = l.user_id
             WHERE l.id = $1`
            , [listingId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Listing not found" });
        }

        const listing = rows[0];

        if (listing.item_photo) {
            const base64Image = listing.item_photo.toString('base64');
            listing.item_photo = `data:image/jpg;base64,${base64Image}`;
        }

        res.json(listing);
    }
    catch (err) {
        res.status(500).json({error: err.message});
    }
});

// GET all listings from specific user
router.get("/listing-view/my-listings", async (req, res) => {
    if(!req.session.user) {
        res.status(401).json({message: 'Not logged in'});
    }

    try{
        const userId = req.session.user.id;

        const { rows } = await db.query(
            `SELECT * FROM listings WHERE user_id = $1`, 
            [userId]
        );

        const listingsWithImages = rows.map(listing => {
            if(listing.item_photo){
                const base64Image = Buffer.from(listing.item_photo).toString('base64');

                return {
                    ...listing,
                    item_photo: `data:image/jpeg;base64,${base64Image}`
                }
            }
            return listing;
        })

        res.json(listingsWithImages);
    }
    catch(err){
        console.error(err);
        res.status(500).json({message: "Server error or whatever"});
    }
});

// CREATE a new listing and send to the DB
router.post("/", upload.single('item_photo'), async (req, res) => {

    try {
    
        const { year, make, model, description, location, price, mileage } = req.body;

        if (!req.session.user) {
            return res.status(401).json({ message: "Not logged in" });
        }

        const imageBuffer = req.file ? req.file.buffer : null;

        const yearParsed = parseInt(year);
        const priceParsed = parseFloat(price);
        const mileageParsed = parseInt(mileage);

        try {
            const userId = req.session.user.id;

            const { rows } = await db.query(
                `INSERT INTO listings (item_photo, car_year, car_make, car_model, description, location, price, mileage, user_id)
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [imageBuffer, yearParsed, make, model, description, location, priceParsed, mileageParsed, userId]
            );

            res.status(201).json({
                message: 'Listing created successfully',
                data: rows[0]
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message, message: 'Failed to save listing, Please try again.' });
        }

    } catch (err) {
        console.error('POST ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const {id} = req.params;

    try{
        const result = await db.query(
            `DELETE FROM listings WHERE id = $1 RETURNING *`, [id]
        );
        if (result.rowCount === 0) {
        return res.status(404).json({ message: "Listing not found" });
        }
        res.json({message:"Deleted", deleted: result.rows[0]});
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// PATCH route to edit a listing with file upload
router.patch("/edit-listing/:id", upload.single('item_photo'), async (req, res) => {
    try {
        const { id } = req.params;
        const { car_year, car_make, car_model, description, location, price } = req.body;

        if (!req.session.user) {
            return res.status(401).json({ message: "Not logged in" });
        }
        const userId = req.session.user.id;

        const imageBuffer = req.file ? req.file.buffer : null;

        const yearParsed = car_year ? parseInt(car_year) : null;
        const priceParsed = price ? parseFloat(price) : null;

        // Construct the Update Query
        // Needed to handle 2 cases if user uploads a different image or not:
        // Case A: User uploaded a new photo -> Update item_photo + other fields
        // Case B: User kept the old photo (req.file is undefined) -> Update only other fields

        let query = '';
        let params = [];

        if (imageBuffer) {
            // Case A: Update everything including photo
            query = `
                UPDATE listings 
                SET item_photo = $1, 
                    car_year = $2, 
                    car_make = $3, 
                    car_model = $4, 
                    description = $5, 
                    location = $6, 
                    price = $7
                WHERE id = $8 AND user_id = $9
                RETURNING *
            `;
            params = [imageBuffer, yearParsed, car_make, car_model, description, location, priceParsed, id, userId];
        } else {
            // Case B: Update fields BUT Keep existing item_photo (do not overwrite with NULL)
            query = `
                UPDATE listings 
                SET car_year = $1, 
                    car_make = $2, 
                    car_model = $3, 
                    description = $4, 
                    location = $5, 
                    price = $6
                WHERE id = $7 AND user_id = $8
                RETURNING *
            `;
            params = [yearParsed, car_make, car_model, description, location, priceParsed, id, userId];
        }

        const { rows } = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Listing not found or unauthorized" });
        }

        res.json({
            message: 'Listing updated successfully',
            data: rows[0]
        });

    } catch (err) {
        console.error('PATCH ERROR:', err);
        res.status(500).json({ message: 'Failed to update listing', error: err.message });
    }
});

module.exports = router;