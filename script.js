document.getElementById('parseBtn').addEventListener('click', () => {
	const htmlString = document.getElementById('inputHtml').value;
	const doc = new DOMParser().parseFromString(htmlString, 'text/html');
	const boxes = Array.from(doc.querySelectorAll('.pokemonBoxTiny'));

	// Парсинг данных и статистик
	const rawData = boxes.map(box => {
		const name = box.querySelector('.name')?.textContent.trim() || '';
		const icon = box.querySelector('.shorts .icon-sex-1, .shorts .icon-sex-2');
		const gender = icon?.classList.contains('icon-sex-1')
			? 'мальчик'
			: 'девочка';
		const code = box.querySelector('.ivcode')?.textContent.trim() || '';
		const group = code.slice(-1) || '';
		const match = code.match(/h(\d+)a(\d+)d(\d+)s(\d+)sa(\d+)sd(\d+)/);
		const stats = match
			? {
					h: +match[1],
					a: +match[2],
					d: +match[3],
					s: +match[4],
					sa: +match[5],
					sd: +match[6],
			  }
			: { h: 0, a: 0, d: 0, s: 0, sa: 0, sd: 0 };
		const sumStats = Object.values(stats).reduce((sum, v) => sum + v, 0);
		return { name, gender, code, group, stats, sumStats };
	});

	// Сортировка и рендер первого списка
	const sortedData = [...rawData].sort((a, b) => {
		if (a.group === b.group) return a.gender.localeCompare(b.gender, 'ru');
		return a.group.localeCompare(b.group, 'ru');
	});
	renderTable(sortedData, 'result');

	// Построение пар методом максимального сочетания по весам (жадный алгоритм)
	const pairs = [];
	// Группируем по полу и группе
	const malesByGroup = {};
	const femalesByGroup = {};
	rawData.forEach(p => {
		const col = p.gender === 'мальчик' ? malesByGroup : femalesByGroup;
		col[p.group] = col[p.group] || [];
		col[p.group].push(p);
	});

	// Для каждой группы формируем все возможные пары и жадно отбираем лучшие
	Object.keys(malesByGroup).forEach(group => {
		if (!femalesByGroup[group]) return;
		const males = malesByGroup[group];
		const females = femalesByGroup[group];
		// Составляем все комбинации
		const combos = [];
		males.forEach(m => {
			females.forEach(f => {
				const childStats = {
					h: Math.max(m.stats.h, f.stats.h),
					a: Math.max(m.stats.a, f.stats.a),
					d: Math.max(m.stats.d, f.stats.d),
					s: Math.max(m.stats.s, f.stats.s),
					sa: Math.max(m.stats.sa, f.stats.sa),
					sd: Math.max(m.stats.sd, f.stats.sd),
				};
				const sumChild = Object.values(childStats).reduce(
					(sum, v) => sum + v,
					0
				);
				const childCode = `h${childStats.h}a${childStats.a}d${childStats.d}s${childStats.s}sa${childStats.sa}sd${childStats.sd}.100${group}`;
				combos.push({ m, f, group, childCode, sumChild });
			});
		});
		// Сортировка комбинаций по мощности потомка
		combos.sort((a, b) => b.sumChild - a.sumChild);
		const usedM = new Set(),
			usedF = new Set();
		combos.forEach(c => {
			if (!usedM.has(c.m) && !usedF.has(c.f)) {
				usedM.add(c.m);
				usedF.add(c.f);
				pairs.push(c);
			}
		});
	});

	// Сортируем итоговые пары по сумме генекода потомка
	pairs.sort((a, b) => b.sumChild - a.sumChild);
	renderPairsTable(pairs, 'pairingResult');
});

function renderTable(data, containerId) {
	const container = document.getElementById(containerId);
	container.innerHTML = '';
	if (!data.length) {
		container.textContent = 'Нет данных.';
		return;
	}
	const table = document.createElement('table');
	const thead = document.createElement('thead');
	['№', 'Имя', 'Пол', 'Код', 'Группа'].forEach(text => {
		const th = document.createElement('th');
		th.textContent = text;
		thead.appendChild(th);
	});
	table.appendChild(thead);
	const tbody = document.createElement('tbody');
	data.forEach((p, i) => {
		const tr = document.createElement('tr');
		[i + 1, p.name, p.gender, p.code, p.group].forEach(v => {
			const td = document.createElement('td');
			td.textContent = v;
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}

function renderPairsTable(pairs, containerId) {
	const container = document.getElementById(containerId);
	container.innerHTML = '';
	if (!pairs.length) {
		container.textContent = 'Нет пар.';
		return;
	}
	const table = document.createElement('table');
	const thead = document.createElement('thead');
	['№', 'Мальчик', 'Девочка', 'Группа', 'Потомок', 'Сумма'].forEach(text => {
		const th = document.createElement('th');
		th.textContent = text;
		thead.appendChild(th);
	});
	table.appendChild(thead);
	const tbody = document.createElement('tbody');
	pairs.forEach((c, i) => {
		const tr = document.createElement('tr');
		const maleInfo = `${c.m.name} (${c.m.code})`;
		const femaleInfo = `${c.f.name} (${c.f.code})`;
		const childInfo = `Потомок (${c.childCode})`;
		[i + 1, maleInfo, femaleInfo, c.group, childInfo, c.sumChild].forEach(v => {
			const td = document.createElement('td');
			td.textContent = v;
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}
