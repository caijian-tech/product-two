document.addEventListener('DOMContentLoaded', () => {
    console.log('블로그 시스템 초기화됨');
    const postForm = document.getElementById('post-form');
    const postsContainer = document.getElementById('posts-container');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const categoryInput = document.getElementById('post-category');
    
    // Modal elements
    const exchangeRateEl = document.getElementById('exchange-rate');
    const modal = document.getElementById('history-modal');
    const closeModal = document.querySelector('.close-modal');
    const historyList = document.getElementById('history-list');
    const chartContainer = document.getElementById('history-chart-container');

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

    // Fetch USD and CNY to KRW exchange rates
    async function fetchExchangeRate() {
        const usdRateValue = document.getElementById('usd-rate');
        const cnyRateValue = document.getElementById('cny-rate');
        
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            const usdToKrw = data.rates.KRW;
            const usdToCny = data.rates.CNY;
            const cnyToKrw = usdToKrw / usdToCny;

            if (usdRateValue) {
                usdRateValue.textContent = `₩${usdToKrw.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}`;
            }
            if (cnyRateValue) {
                cnyRateValue.textContent = `₩${cnyToKrw.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}`;
            }
        } catch (error) {
            console.error('환율 정보를 가져오는데 실패했습니다:', error);
            try {
                const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD');
                const fallbackData = await fallbackRes.json();
                
                const usdToKrw = fallbackData.rates.KRW;
                const usdToCny = fallbackData.rates.CNY;
                const cnyToKrw = usdToKrw / usdToCny;

                if (usdRateValue) {
                    usdRateValue.textContent = `₩${usdToKrw.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}`;
                }
                if (cnyRateValue) {
                    cnyRateValue.textContent = `₩${cnyToKrw.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}`;
                }
            } catch (fallbackError) {
                if (usdRateValue) usdRateValue.textContent = '연결 오류';
                if (cnyRateValue) cnyRateValue.textContent = '연결 오류';
            }
        }
    }

    fetchExchangeRate();
    setInterval(fetchExchangeRate, 600000);

    // Historical Rates Logic - Attach to USD Box
    const usdBox = document.getElementById('usd-box');
    if (usdBox) {
        usdBox.addEventListener('click', () => {
            modal.style.display = 'block';
            fetchHistoricalRates();
        });
    }

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    async function fetchHistoricalRates() {
        historyList.innerHTML = '';
        chartContainer.innerHTML = '<div class="loading-spinner">최근 10년 데이터를 분석 중...</div>';
        
        const years = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 10; i++) {
            years.push(currentYear - i);
        }

        try {
            // Fetching year-end rates for the last 10 years using Frankfurter API
            const historyData = [];
            
            // To be efficient, we fetch in parallel
            const fetchPromises = years.map(year => 
                fetch(`https://api.frankfurter.app/${year}-12-31?from=USD&to=KRW`)
                .then(res => res.json())
                .catch(() => null)
            );

            const results = await Promise.all(fetchPromises);
            
            chartContainer.innerHTML = ''; // Clear spinner
            
            results.forEach((data, index) => {
                if (data && data.rates && data.rates.KRW) {
                    const rate = data.rates.KRW;
                    const year = years[index];
                    
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `
                        <span class="history-year">${year}년 말</span>
                        <span class="history-rate">₩${rate.toFixed(1)}</span>
                    `;
                    historyList.appendChild(item);
                    historyData.push({ year, rate });
                }
            });

            if (historyData.length === 0) {
                chartContainer.innerHTML = '<div class="loading-spinner">데이터를 불러올 수 없습니다.</div>';
            }
        } catch (error) {
            console.error('역사적 환율 데이터 fetch 실패:', error);
            chartContainer.innerHTML = '<div class="loading-spinner">데이터 로드 오류 발생</div>';
        }
    }
});