const http = require('http'); 
const bp = require('body-parser'); 
const express = require('express'); const path = require('path'); const fs = require('fs'); const multer = require('multer');
const userAccountModel = require('./models/user_account'); 
const jwt = require('./libs/jwt'); 
const dateUtils = require('./libs/date_utils'); 
const cors = require('cors'); 
const app = express(); 


const companies = require('./models/companies'); 
const videos = require('./models/videos');
const supportRequests = require('./models/support_requests');
const authRegistration = require('./models/auth_registration');

app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());
app.use(cors()); const videoUploadDir = path.join(__dirname, 'uploads', 'videos'); fs.mkdirSync(videoUploadDir, { recursive: true }); app.use('/uploads/videos', express.static(videoUploadDir)); const videoStorage = multer.diskStorage({ destination: videoUploadDir, filename: (req, file, cb) => cb(null, require('crypto').randomUUID() + path.extname(file.originalname).toLowerCase()) }); const receiveVideo = multer({ storage: videoStorage, limits: { fileSize: 500 * 1024 * 1024 }, fileFilter: (req, file, cb) => /\.(mp4|mov)$/i.test(file.originalname) ? cb(null, true) : cb(new Error('Only MP4 and MOV files are supported')) });
const hostname = '127.0.0.1';
const port = 3000;


app.get("/api/users", (req, res) => {
    var response = {
        isError: true,
        data: "You are unauthorized for this data"
    };
    res.send(JSON.stringify(response));
});

app.post("/api/multiple_by_2", (req, res) => {
    var response = {
        isError: false,
        data: {
            no1: req.body.no_1 * 2,
            no2: req.body.no_2 * 2
        }
    };
    res.send(JSON.stringify(response));
});

app.get("/api/user/:accountId", async (req, res) => {
    const accountId = req.params.accountId;
    const response = await userAccountModel.getUserAccountById(accountId);
    res.send(JSON.stringify(response));
});


const checkAccessToken = (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    } else {
        token = req.body.token;
    }

    jwt.verify(token)
    .then((decoded) => {
        req.decoded = decoded;
        next();
    }, (err) => {
        res.json({
            isError: false,
            result: false,
            errorMessage: "ขอภัย คุณไม่ได้รับอนุญาตให้เข้าถึงข้อมูลนี้"
        });
    });
}

app.post('/api/authen/register', async (req, res) => {
    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!firstName || !lastName || !username || !email || !password) {
        return res.status(400).json({ isError: true, errorMessage: 'กรุณากรอกข้อมูลให้ครบ' });
    }
    if (firstName.length > 30 || lastName.length > 30 || username.length > 20 || email.length > 50 || password.length < 8) {
        return res.status(400).json({ isError: true, errorMessage: 'ตรวจสอบความยาวข้อมูลและใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ isError: true, errorMessage: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    const result = await authRegistration.register({ firstName, lastName, username, email, password });
    if (result.isError) {
        const status = result.errorCode === 'DUPLICATE_ACCOUNT' ? 409 : 500;
        return res.status(status).json(result);
    }
    return res.status(201).json(result);
});

app.post('/api/authen/reset_password', async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !email || password.length < 8) {
        return res.status(400).json({ isError: true, errorMessage: 'กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษร' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ isError: true, errorMessage: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    const result = await authRegistration.resetPassword({ username, email, password });
    if (result.isError) {
        const status = result.errorCode === 'ACCOUNT_NOT_FOUND' ? 404 : 500;
        return res.status(status).json(result);
    }
    return res.json({ isError: false, message: 'Password updated' });
});

app.post('/api/support/requests', async (req, res) => {
    try {
        const requestType = String(req.body?.requestType || '').trim().toUpperCase();
        const fullName = String(req.body?.fullName || '').trim();
        const username = String(req.body?.username || '').trim();
        const email = String(req.body?.email || '').trim().toLowerCase();
        const message = String(req.body?.message || '').trim();
        const validType = ['PASSWORD_RESET', 'CONTACT_ADMIN'].includes(requestType);
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!validType || !validEmail) {
            return res.status(400).json({ isError: true, errorMessage: 'กรุณาตรวจสอบประเภทคำขอและอีเมล' });
        }
        if (requestType === 'PASSWORD_RESET' && (!username || username.length > 100)) {
            return res.status(400).json({ isError: true, errorMessage: 'กรุณากรอกชื่อผู้ใช้ให้ถูกต้อง' });
        }
        if (requestType === 'CONTACT_ADMIN' && (!fullName || !message)) {
            return res.status(400).json({ isError: true, errorMessage: 'กรุณากรอกชื่อและรายละเอียดที่ต้องการติดต่อ' });
        }
        if (fullName.length > 120 || email.length > 254 || message.length > 4000) {
            return res.status(400).json({ isError: true, errorMessage: 'ข้อมูลยาวเกินกำหนด' });
        }

        const result = await supportRequests.createRequest({ requestType, fullName, username, email, message });
        if (result.isError) throw new Error(result.errorMessage);
        return res.status(201).json({ isError: false, message: 'Request received', data: result.data });
    } catch (error) {
        console.error('Support request error:', error.message);
        return res.status(500).json({ isError: true, errorMessage: 'บันทึกคำขอไม่สำเร็จ กรุณาลองอีกครั้ง' });
    }
});

app.get("/api/company/get_all", checkAccessToken, async (req, res) => {
    const response = await companies.getAllCompanies();
    res.json(response);
});

app.post("/api/company/add", checkAccessToken, async (req, res) => {
    try {
        const companyName = String(req.body.CompanyName || "").trim();
        const province = String(req.body.Province || "").trim();
        const address = String(req.body.Location || "").trim();
        const phone = req.body.Phone == null ? "" : String(req.body.Phone).trim();
        const mapUrl = req.body.MapUrl == null ? "" : String(req.body.MapUrl).trim();
        if (!companyName || !province) {
            return res.status(400).json({ isError: true, errorMessage: "Company name and province are required" });
        }
        if (phone.length > 30 || mapUrl.length > 500 || (mapUrl && !/^https?:\/\//i.test(mapUrl))) {
            return res.status(400).json({ isError: true, errorMessage: "ตรวจสอบเบอร์โทรและลิงก์แผนที่" });
        }
        const result = await companies.getOrCreateCompany(companyName, province, address, phone, mapUrl);
        return res.status(result.isError ? 400 : 201).json(result);
    } catch (error) {
        return res.status(500).json({ isError: true, errorMessage: error.message });
    }
});

app.put("/api/company/update/:companyId", checkAccessToken, async (req, res) => {
    try {
        const companyId = String(req.params.companyId || "").trim();
        const companyName = String(req.body.CompanyName || "").trim();
        const province = String(req.body.Province || "").trim();
        const address = String(req.body.Location || "").trim();
        const phone = Object.prototype.hasOwnProperty.call(req.body, 'Phone') ? String(req.body.Phone ?? '').trim() : null;
        const mapUrl = Object.prototype.hasOwnProperty.call(req.body, 'MapUrl') ? String(req.body.MapUrl ?? '').trim() : null;
        if ((phone?.length ?? 0) > 30 || (mapUrl?.length ?? 0) > 500) {
            return res.status(400).json({ isError: true, errorMessage: "Phone or map link is too long" });
        }
        if (mapUrl && !/^https?:\/\//i.test(mapUrl)) {
            return res.status(400).json({ isError: true, errorMessage: "Map link must start with http:// or https://" });
        }
        if (!companyId || !companyName || !province) {
            return res.status(400).json({ isError: true, errorMessage: "Company, name and province are required" });
        }
        const result = await companies.updateCompanyDetails(companyId, companyName, province, address, phone, mapUrl);
        if (result.isError) return res.status(400).json(result);
        return res.json({ isError: false, message: "Company updated", data: { CompanyID: companyId } });
    } catch (error) {
        return res.status(500).json({ isError: true, errorMessage: error.message });
    }
});

app.delete("/api/company/delete/:companyId", checkAccessToken, async (req, res) => {
    try {
        const companyId = String(req.params.companyId || "").trim();
        if (!companyId) return res.status(400).json({ isError: true, errorMessage: "Company ID is required" });
        const result = await companies.deleteCompany(companyId);
        return res.status(result.isError ? 404 : 200).json(result);
    } catch (error) {
        return res.status(500).json({ isError: true, errorMessage: error.message });
    }
});

app.get("/api/company/videos_by_province", checkAccessToken, async (req, res) => {
    const response = await companies.getVideoCountsByProvince();
    res.json(response);
});

app.get("/api/company/video_counts", checkAccessToken, async (req, res) => {
    const response = await companies.getCompanyVideoCounts();
    res.json(response);
});

app.get("/api/video/get_all_by_user", checkAccessToken, async (req, res) => {
    console.log(req.decoded);
    const accountId = req.decoded.user_id;
    const response = await videos.getAllVideosByUser(accountId);
    res.json(response);
});

app.post("/api/video/add", checkAccessToken, receiveVideo.single("video"), async (req, res) => {
    try {
        const videoId = String(req.body.VideoID || (Date.now().toString(36) + require('crypto').randomBytes(5).toString('hex')).slice(0, 20)).trim();
        let companyId = String(req.body.CompanyID || "").trim() || null;
        const companyName = String(req.body.CompanyName || "").trim();
        const province = String(req.body.Province || "").trim();
        const companyAddress = String(req.body.CompanyAddress || "").trim();
        if (companyName && province) {
            const company = await companies.getOrCreateCompany(companyName, province, companyAddress);
            if (company.isError) return res.status(400).json(company);
            companyId = company.data.CompanyID;
        }
        const externalUrl = String(req.body.VideoURL || "").trim();
        if (videoId.length > 20) return res.status(400).json({ isError: true, errorMessage: "Video ID must be 20 characters or fewer" });
        if (!req.file && !externalUrl) return res.status(400).json({ isError: true, errorMessage: "Choose an MP4/MOV file or provide a video URL" });
        const videoPath = req.file ? "/uploads/videos/" + req.file.filename : externalUrl;
        const result = await videos.addVideo({ videoId, userId: req.decoded.user_id, companyId, title: String(req.body.VideoTitle || videoId).slice(0, 100), videoPath });
        if (result.isError && req.file) fs.unlink(req.file.path, () => {});
        return res.status(result.isError ? 400 : 201).json(result);
    } catch (error) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(500).json({ isError: true, errorMessage: error.message });
    }
});
app.put("/api/video/update/:videoId", checkAccessToken, receiveVideo.single("video"), async (req, res) => {
    try {
        const oldVideoId = req.params.videoId;
        const newVideoId = String(req.body.VideoID || oldVideoId).trim();
        let companyId = String(req.body.CompanyID || "").trim() || null;
        const companyName = String(req.body.CompanyName || "").trim();
        const province = String(req.body.Province || "").trim();
        const companyAddress = String(req.body.CompanyAddress || "").trim();
        const externalUrl = String(req.body.VideoURL || "").trim();
        if (!newVideoId || newVideoId.length > 20) return res.status(400).json({ isError: true, errorMessage: "Video ID is required (maximum 20 characters)" });
        if (companyName && province) {
            const company = companyId
                ? await companies.updateCompanyDetails(companyId, companyName, province, companyAddress)
                : await companies.getOrCreateCompany(companyName, province, companyAddress);
            if (company.isError) return res.status(400).json(company);
            if (!companyId) companyId = company.data.CompanyID;
        }
        const result = await videos.updateVideo({
            oldVideoId, newVideoId, userId: req.decoded.user_id, companyId,
            title: String(req.body.VideoTitle || companyName || newVideoId).slice(0, 100), videoPath: req.file ? "/uploads/videos/" + req.file.filename : externalUrl || null
        });
        if (result.isError) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json(result);
        }
        const oldPath = result.data.oldVideoPath;
        if (oldPath && oldPath.startsWith("/uploads/videos/") && (req.file || externalUrl)) {
            fs.unlink(path.join(videoUploadDir, path.basename(oldPath)), () => {});
        }
        return res.json({ isError: false, message: "Video updated", data: result.data });
    } catch (error) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(500).json({ isError: true, errorMessage: error.message });
    }
});
app.delete("/api/video/delete/:videoId", checkAccessToken, async (req, res) => {
    try {
        const videoId = String(req.params.videoId || "").trim();
        const result = await videos.deleteVideo({ videoId, userId: req.decoded.user_id });
        if (result.isError) return res.status(404).json(result);
        const videoPath = result.data.VideoPath;
        if (videoPath && videoPath.startsWith("/uploads/videos/")) {
            fs.unlink(path.join(videoUploadDir, path.basename(videoPath)), (error) => {
                if (error && error.code !== "ENOENT") console.error("Unable to remove video file:", error.message);
            });
        }
        return res.json({ isError: false, message: "Video deleted" });
    } catch (error) {
        return res.status(500).json({ isError: true, errorMessage: error.message });
    }
});
app.post("/api/authen/login", async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
        return res.status(400).json({ isError: true, data: '', errorMessage: 'Username and password are required' });
    }

    const result = await userAccountModel.authenticateUser(username, password);
    if (result.isError) {
        const isInvalidLogin = result.errorMessage === 'Invalid username or password';
        return res.status(isInvalidLogin ? 401 : 500).json({
            isError: true,
            data: '',
            errorMessage: isInvalidLogin ? result.errorMessage : 'Unable to access the user database'
        });
    }

    const user = result.data;
    const accessToken = jwt.sign({
        user_id: user.UID,
        username: user.Username,
        firstName: user.FirstName,
        date: dateUtils.getCurrentDateForToken()
    });
    return res.json({
        isError: false,
        data: {
            access_token: accessToken,
            user_info: { UID: user.UID, Username: user.Username, FirstName: user.FirstName }
        },
        errorMessage: ''
    });
});
app.post("/api/authen/access_request", async (req, res) => {
    const authenSignature = req.body.authen_signature;
    const authenToken = req.body.authen_token;

    var decoded = jwt.verify(authenToken);
    let response;

    if (decoded) {
        const result = await userAccountModel.checkAccessRequest(authenSignature, authenToken);
        console.log(result);

        if (result.isError) {
            response = { isError: true, data: "", errorMessage: result.errorMessage };
        } else {
            var payload = {
                user_id: result.data[0].UID,
                username: result.data[0].Username,
                firstName: result.data[0].FirstName,
                date: dateUtils.getCurrentDateForToken()
            };

            const accessToken = jwt.sign(payload);
            response = {
                isError: false,
                data: {
                    access_token: accessToken,
                    firstName: result.data[0].FirstName
                },
                errorMessage: ""
            }
        }
    } else {
        response = {
            isError: true,
            data: "",
            errorMessage: "ขออภัย คุณไม่ได้รับอนุญาตให้เข้าถึงข้อมูลนี้"
        };
    }

    res.send(JSON.stringify(response));
});

app.post("/api/authen/authen_request", async (req, res) => {
    console.log(req.body.authen_request);

    const authenRequest = req.body.authen_request;
    const result = await userAccountModel.checkAuthenRequest(authenRequest);
    console.log(result);

    let response;

    if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };
    } else {
        var payload = { username: result.data[0].Username };
        const authenToken = jwt.sign(payload);
        
        response = {
            isError: false,
            data: authenToken,
            errorMessage: ""
        };
    }

    res.send(JSON.stringify(response));
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});


const pool = require('./libs/db_pool');

async function ensureCompanyProvinceColumn() {
    let conn;
    try {
        conn = await pool.getConnection();
        const columns = await conn.query("SHOW COLUMNS FROM Company LIKE 'Province'");
        if (columns.length === 0) {
            await conn.query("ALTER TABLE Company ADD COLUMN Province VARCHAR(100) NULL AFTER Location");
            console.log('Added Company.Province column');
        }
        const phoneColumns = await conn.query("SHOW COLUMNS FROM Company LIKE 'Phone'");
        if (phoneColumns.length === 0) await conn.query("ALTER TABLE Company ADD COLUMN Phone VARCHAR(30) NULL AFTER Province");
        const mapColumns = await conn.query("SHOW COLUMNS FROM Company LIKE 'MapUrl'");
        if (mapColumns.length === 0) await conn.query("ALTER TABLE Company ADD COLUMN MapUrl VARCHAR(500) NULL AFTER Phone");
    } finally {
        if (conn) conn.release();
    }
}

ensureCompanyProvinceColumn().catch((error) => {
    console.error('Could not prepare Company columns:', error.message);
});
