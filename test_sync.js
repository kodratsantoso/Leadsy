const token = '118|LxiaXJo1QtQirI2PwNnaoYXt0YY24rBSxqtuNpze6a9f1594';
fetch('http://localhost:8000/api/lark/base/mappings/1/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ direction: 'pull', limit: 3000 })
})
.then(async res => {
  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('Body:', text);
})
.catch(err => console.error(err));
