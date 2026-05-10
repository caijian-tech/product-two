document.addEventListener('DOMContentLoaded', () => {
    console.log('블로그 시스템 초기화됨');
    const postForm = document.getElementById('post-form');
    const postsContainer = document.getElementById('posts-container');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const categoryInput = document.getElementById('post-category');

    // Load posts from Local Storage
    let posts = JSON.parse(localStorage.getItem('blog-posts')) || [];

    // Function to render all posts
    function renderPosts() {
        postsContainer.innerHTML = '';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #b2bec3;">
                    <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">아직 게시글이 없습니다.</p>
                    <p style="font-size: 0.9rem;">첫 번째 멋진 생각을 들려주세요!</p>
                </div>
            `;
            return;
        }

        // Sort posts by date (newest first)
        const sortedPosts = [...posts].sort((a, b) => b.id - a.id);

        sortedPosts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            
            const date = new Date(post.id).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            postElement.innerHTML = `
                <button class="delete-btn" onclick="deletePost(${post.id})">삭제</button>
                <span class="category-tag tag-${getCategoryClass(post.category)}">${post.category || '일반'}</span>
                <h3>${escapeHtml(post.title)}</h3>
                <span class="post-date">${date}</span>
                <div class="post-content">${escapeHtml(post.content)}</div>
            `;
            postsContainer.appendChild(postElement);
        });
    }

    function getCategoryClass(category) {
        switch(category) {
            case '미식': return 'gourmet';
            case '쇼핑': return 'shopping';
            case '드라이브': return 'drive';
            default: return 'default';
        }
    }

    // Helper to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Global delete function
    window.deletePost = function(id) {
        if (confirm('정말로 이 글을 삭제하시겠습니까?')) {
            posts = posts.filter(post => post.id !== id);
            localStorage.setItem('blog-posts', JSON.stringify(posts));
            renderPosts();
        }
    };

    // Handle form submission
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newPost = {
            id: Date.now(),
            category: categoryInput.value,
            title: titleInput.value,
            content: contentInput.value
        };

        posts.push(newPost);
        localStorage.setItem('blog-posts', JSON.stringify(posts));

        // Clear inputs and re-render
        categoryInput.value = '';
        titleInput.value = '';
        contentInput.value = '';
        renderPosts();
    });

    // Initial render
    renderPosts();

    // Fetch USD to KRW exchange rate
    async function fetchExchangeRate() {
        const rateValue = document.querySelector('.rate-value');
        try {
            // Using a more reliable open API (ExchangeRate.host or similar)
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const rate = data.rates.KRW;
            if (rateValue) {
                rateValue.textContent = `₩${rate.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}`;
            }
        } catch (error) {
            console.error('환율 정보를 가져오는데 실패했습니다:', error);
            // Fallback to another API if the first one fails
            try {
                const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD');
                const fallbackData = await fallbackRes.json();
                const fallbackRate = fallbackData.rates.KRW;
                if (rateValue) {
                    rateValue.textContent = `₩${fallbackRate.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}`;
                }
            } catch (fallbackError) {
                if (rateValue) rateValue.textContent = '연결 오류';
            }
        }
    }

    fetchExchangeRate();
    // Refresh every 10 minutes
    setInterval(fetchExchangeRate, 600000);
});