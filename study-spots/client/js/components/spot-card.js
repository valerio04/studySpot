(function () {
    const createSpotCardElement = (spot, options = {}) => {
        const card = document.createElement('div');
        card.className = 'spot-card-modern';

        const name = spot?.name || 'Spot senza nome';
        const address = spot?.address || '';
        const typeLabel = spot?.type || '';
        const starAvg = Number(spot?.star_avg ?? 0);
        const rating = Number.isFinite(starAvg) ? starAvg.toFixed(1) : '0.0';
        const starCount = spot?.star_count ?? 0;
        const commentCount = spot?.comment_count ?? 0;

        const showVotes = options.showVotes !== false;
        const showComments = options.showComments === true;
        const showType = options.showType !== false;

        const badges = [];

        if (showVotes) {
            badges.push(`<span class="badge badge-custom text-dark-blue border border-dark-blue">⭐ ${rating}</span>`);
            badges.push(`<span class="badge badge-custom text-dark-blue border border-dark-blue">🗳️ ${starCount}</span>`);
        }

        if (showComments) {
            badges.push(`<span class="badge badge-custom text-dark-blue border border-dark-blue">💬 ${commentCount}</span>`);
        }

        card.innerHTML = `
            <div class="card-img-top-placeholder" style="background-color: var(--dark-blue);"></div>
            <div class="p-3">
                <h3 class="h6 fw-bold text-dark-blue mb-1">${name}</h3>
                ${showType && typeLabel ? `<div class="mb-2"><span class="badge badge-custom text-dark-blue border border-dark-blue">${typeLabel}</span></div>` : ''}
                ${address ? `<p class="small text-muted mb-2">${address}</p>` : ''}
                ${badges.length ? `<div class="d-flex flex-wrap gap-1 mb-2">${badges.join('')}</div>` : ''}
            </div>
        `;

        if (options.onClick) {
            card.addEventListener('click', options.onClick);
        } else if (spot?.id) {
            card.addEventListener('click', () => {
                window.location.href = `/spot?id=${encodeURIComponent(spot.id)}`;
            });
        }

        return card;
    };

    const renderSpotCardList = (container, spots, options = {}) => {
        if (!container) return;
        container.innerHTML = '';

        if (!Array.isArray(spots) || spots.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'spot-card-modern';
            empty.innerHTML = `
                <div class="card-img-top-placeholder bg-light"></div>
                <div class="p-3">
                    <h3 class="h6 fw-bold text-muted">${options.emptyMessage || 'Nessun dato disponibile'}</h3>
                </div>
            `;
            container.appendChild(empty);
            return;
        }

        spots.forEach((spot) => {
            container.appendChild(createSpotCardElement(spot, options));
        });
    };

    window.SpotCard = {
        create: createSpotCardElement,
        renderList: renderSpotCardList
    };
})();
