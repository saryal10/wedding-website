const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname)));

const DATA_FILE = path.join(__dirname, 'gallery-data.json');
const IMG_DIR = path.join(__dirname, 'img');

if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    // Preserves the existing memory images from the original gallery configuration[cite: 3]
    const initialData = {
        "Memories": [
            { src: 'img/photo1.jpg', caption: 'The Ceremony', type: 'image' },
            { src: 'img/photo2.jpg', caption: 'Special Moments', type: 'image' },
            { src: 'img/photo3.jpg', caption: 'Joyful Smiles', type: 'image' },
            { src: 'img/photo4.jpg', caption: 'Celebration Time', type: 'image' },
            { src: 'img/photo5.jpg', caption: 'Family & Friends', type: 'image' },
            { src: 'img/photo6.jpg', caption: 'Precious Details', type: 'image' },
            { src: 'img/photo7.jpg', caption: 'The Reception', type: 'image' },
            { src: 'img/photo8.jpg', caption: 'Evening Glow', type: 'image' },
            { src: 'img/photo9.jpg', caption: 'Forever Together', type: 'image' }
        ],
        "Thursday 22nd": [],
        "Friday 23rd Oct": [],
        "Saturday 24th October": []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

app.get('/api/gallery', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read gallery data.' });
    }
});

app.post('/api/upload', (req, res) => {
    const { password, category, caption } = req.body;

    if (password !== 'SaradNamuna') {
        return res.status(401).json({ success: false, error: 'Incorrect password. Upload rejected to avoid fraud.' });
    }

    if (!req.files || !req.files.mediaFiles) {
        return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const validCategories = ["Memories", "Thursday 22nd", "Friday 23rd Oct", "Saturday 24th October"];
    if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid category selected.' });
    }

    let uploadedFiles = req.files.mediaFiles;
    if (!Array.isArray(uploadedFiles)) {
        uploadedFiles = [uploadedFiles];
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.webm'];
    const addedItems = [];

    try {
        const galleryData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!galleryData[category]) {
            galleryData[category] = [];
        }

        for (let i = 0; i < uploadedFiles.length; i++) {
            const uploadedFile = uploadedFiles[i];
            const fileExtension = path.extname(uploadedFile.name).toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                continue;
            }

            const filesInImg = fs.readdirSync(IMG_DIR);
            let nextSerial = 1;
            if (filesInImg.length > 0) {
                const numbers = filesInImg
                    .map(f => {
                        const match = f.match(/^photo(\d+)\./);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(n => n > 0);
                if (numbers.length > 0) {
                    nextSerial = Math.max(...numbers) + 1;
                }
            }

            const newFileName = `photo${nextSerial}${fileExtension}`;
            const uploadPath = path.join(IMG_DIR, newFileName);

            if (typeof uploadedFile.mv === 'function') {
                uploadedFile.mvSync ? uploadedFile.mvSync(uploadPath) : fs.writeFileSync(uploadPath, uploadedFile.data);
            } else {
                fs.writeFileSync(uploadPath, uploadedFile.data);
            }

            const isVideo = ['.mp4', '.mov', '.webm'].includes(fileExtension);
            const newItem = {
                src: `img/${newFileName}`,
                caption: caption ? caption.trim() : 'Wedding Moment',
                type: isVideo ? 'video' : 'image'
            };

            galleryData[category].push(newItem);
            addedItems.push(newItem);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(galleryData, null, 2));
        return res.json({ success: true, message: `${addedItems.length} file(s) uploaded successfully!`, items: addedItems });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`Wedding server running on port ${PORT}`);
});