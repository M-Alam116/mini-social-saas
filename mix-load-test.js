import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';

const tokens = new SharedArray('tokens', function () {
    return JSON.parse(open('./tokens.json')).tokens;
});

export const options = {
    stages: [
        { duration: '5s', target: 10 },   // Warm up Redis cache
        { duration: '10s', target: 100 }, // Ramp up
        { duration: '15s', target: 500 }, // Full load
        { duration: '30s', target: 500 }, // Sustain 500 VUs
    ],
};

const BASE_URL = 'http://localhost:8080/api';

export default function () {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const params = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
    // 1. READ FEEDS (Read-heavy) - 40%
    const feedRes = http.get(`${BASE_URL}/posts?page=1`, params);
    const feedJson = JSON.parse(feedRes.body);

    // data is a direct array from the TransformInterceptor
    const postIds = Array.isArray(feedJson.data) ? feedJson.data.map(p => p.id) : [];

    check(feedRes, { 'feed status is 200': (r) => r.status === 200 });

    if (feedRes.status !== 200) {
        console.error(`Feed Error [${feedRes.status}]: ${feedRes.body}`);
    }

    // 2. GET PROFILE STATS (Aggregate-heavy) - 30%
    const profileRes = http.get(`${BASE_URL}/users/profile`, params);
    check(profileRes, { 'profile status is 200': (r) => r.status === 200 });

    if (postIds.length > 0) {
        // Pick a random post ID from the REAL feed
        const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];

        // 3. TOGGLE LIKE (Write-heavy toggle) - 20%
        const likePayload = JSON.stringify({ postId: randomPostId });
        const likeRes = http.post(`${BASE_URL}/likes/toggle`, likePayload, params);
        // 201 = liked, 200 = unliked, 409/404 handled gracefully by server
        const likeCheck = check(likeRes, {
            'like toggle successful': (r) => r.status === 201 || r.status === 200,
        });

        if (!likeCheck) {
            console.error(`Like Error [${likeRes.status}]: ${likeRes.body}`);
        }

        // 4. POST COMMENTS (Write-heavy) - 10%
        const commentPayload = JSON.stringify({
            postId: randomPostId,
            content: `Stress testing comment at ${new Date().toISOString()}`,
        });
        const commentRes = http.post(`${BASE_URL}/comments`, commentPayload, params);
        const commentCheck = check(commentRes, { 'comment status is 201': (r) => r.status === 201 });

        if (!commentCheck) {
            console.error(`Comment Error [${commentRes.status}]: ${commentRes.body}`);
        }
    }

    sleep(1);
}
