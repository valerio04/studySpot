(function () {
    function getTypeLabel(type) {
        const typeMap = {
            bar: 'Bar',
            biblio: 'Biblioteca',
            co: 'Coworking',
            au: 'Aula Studio'
        };

        return typeMap[type] || type || '';
    }
    const createSpotCardElement = (spot, options = {}) => {
        const card = document.createElement('div');
        card.className = 'spot-card-modern';

        const name = spot?.name || 'Spot senza nome';
        const address = spot?.address || '';
        const typeLabel = getTypeLabel(spot?.type);
        const starAvg = Number(spot?.star_avg ?? 0);
        const rating = Number.isFinite(starAvg) ? starAvg.toFixed(1) : '0.0';
        const starCount = spot?.star_count ?? 0;
        const commentCount = spot?.comment_count ?? 0;
        const foto = spot?.copertina ?? 0;

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

        const mediaHTML = foto
            ? `<img src="${foto}" class="w-100 h-100 object-fit-cover" alt="${name}">`
            : `
                <div class="w-100 h-100 bg-dark-blue d-flex align-items-center justify-content-center">
                    <img src="../assets/img/logo.png" alt="Logo" class="spot-card-placeholder-logo">
                </div>
            `;

        card.innerHTML = `
            <div class="spot-card-media flex-shrink-0 overflow-hidden">
                ${mediaHTML}
            </div>

            <div class="spot-card-content p-3 d-flex flex-column">
                <h3 class="h6 fw-bold text-dark-blue mb-1 spot-card-title">
                    ${name}
                </h3>

                ${showType && typeLabel ? `
                    <div class="mb-2">
                        <span class="badge rounded-pill bg-light text-dark-blue border fw-bold">
                            <i class="fa-solid fa-location-dot me-1 text-orange"></i>
                            ${typeLabel}
                        </span>
                    </div>
                ` : ''}

                ${address ? `
                    <p class="small text-muted mb-2 spot-card-address">
                        ${address}
                    </p>
                ` : ''}

                ${badges.length ? `
                    <div class="d-flex flex-wrap gap-1 mt-auto">
                        ${badges.join('')}
                    </div>
                ` : ''}
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
