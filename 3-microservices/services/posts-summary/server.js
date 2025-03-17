const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 4000;
const POSTS_API = "http://172.17.0.3:3000/api/posts/"; // Use the service name in Docker network

// Configure nodemailer to send emails through the postfix container
const transporter = nodemailer.createTransport({
    host: "172.17.0.1",  // The container name of Postfix in the Docker network
    port: 32769,         // SMTP port
    secure: false,    // No SSL/TLS for Postfix in local setup
    tls: { rejectUnauthorized: false } // Allow self-signed certificates
});

app.get("/summary", async (req, res) => {
    try {
        const { from, to } = req.query;
        const response = await axios.get(POSTS_API);
        
        const posts = response.data.filter(post => {
            const createdAt = new Date(post.createdAt);
            return (!from || createdAt >= new Date(from)) &&
                   (!to || createdAt <= new Date(to));
        });

        const summary = posts.reduce((acc, post) => {
            acc[post.user] = (acc[post.user] || 0) + 1;
            return acc;
        }, {});

        const summaryText = `
            Total Posts: ${posts.length}
            User Post Summary: ${JSON.stringify(summary, null, 2)}
        `;

        // Send email
        const mailOptions = {
            from: "no-reply@example.com",
            to: "husnain.devops@gmail.com",
            subject: "New Summary Report",
            text: summaryText
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        res.json({ totalPosts: posts.length, userPosts: summary, message: "Email sent!" });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to fetch posts or send email" });
    }
});

app.listen(PORT, () => {
    console.log(`Posts Summary Service running on port ${PORT}`);
});

