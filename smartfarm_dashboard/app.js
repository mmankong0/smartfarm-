// 대시보드 상태 관리 객체
let rawData = [];
let filteredData = [];
let charts = {};

// 샘플 데이터 배열 (파일이 없을 때 기본 로드용)
const sampleData = [
    { "시도": "경산시", "작물명": "딸기", "측정일자": "2025-01-06", "평균기온": 14.3, "평균습도": 72.5, "CO2농도": 781, "일사량": 134.2, "생육지수": 85.6 },
    { "시도": "경산시", "작물명": "오이", "측정일자": "2025-01-27", "평균기온": 21.8, "평균습도": 82.7, "CO2농도": 792, "일사량": 187.3, "생육지수": 100 },
    { "시도": "경산시", "작물명": "파프리카", "측정일자": "2025-02-17", "평균기온": 23.6, "평균습도": 58.7, "CO2농도": 836, "일사량": 210.7, "생육지수": 90 },
    { "시도": "경산시", "작물명": "토마토", "측정일자": "2025-03-10", "평균기온": 23.3, "평균습도": 62.6, "CO2농도": 800, "일사량": 226.9, "생육지수": 96.5 }
];

// 문서 로드 완료 후 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('csvFileInput').addEventListener('change', handleFileUpload);
    document.getElementById('loadSampleBtn').addEventListener('click', () => loadDataset(sampleData));
    document.getElementById('sidoFilter').addEventListener('change', applyFilters);
    document.getElementById('cropFilter').addEventListener('change', applyFilters);
    
    // 처음 시작 시 샘플 데이터로 초기화 가능
    loadDataset(sampleData);
});

// CSV 파일 업로드 핸들러
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCSV(text);
    };
    // 한국어 인코딩 문제를 방지하기 위해 기본적으로 UTF-8로 읽고, 실패 유무에 따라 조정 가능하도록 함
    reader.readAsText(file, "UTF-8");
}

// 간단한 CSV 파서 (따옴표 분리는 제외한 기본 형태)
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return;

    // 헤더 정제
    const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g, ''));
    
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const columns = lines[i].split(',').map(c => c.trim().replace(/\"/g, ''));
        
        if (columns.length >= headers.length) {
            let row = {};
            headers.forEach((header, index) => {
                // 매핑 키 단순화 (단위 제거하여 처리하기 쉽게 변경)
                let key = header;
                if (header.includes("평균기온")) key = "평균기온";
                else if (header.includes("평균습도")) key = "평균습도";
                else if (header.includes("CO2농도")) key = "CO2농도";
                else if (header.includes("일사량")) key = "일사량";
                else if (header.includes("생육지수")) key = "생육지수";
                else if (header.includes("시도")) key = "시도";
                else if (header.includes("작물명")) key = "작물명";
                else if (header.includes("측정일자")) key = "측정일자";

                // 수치형 데이터 변환
                let val = columns[index];
                if (!isNaN(val) && val !== '') {
                    row[key] = parseFloat(val);
                } else {
                    row[key] = val;
                }
            });
            parsed.push(row);
        }
    }
    loadDataset(parsed);
}

// 데이터셋 로드 후 화면 갱신
function loadDataset(data) {
    rawData = data;
    updateFilterOptions();
    applyFilters();
}

// 필터 옵션 다이내믹하게 채우기
function updateFilterOptions() {
    const sidos = [...new Set(rawData.map(item => item.시도))].filter(Boolean);
    const crops = [...new Set(rawData.map(item => item.작물명))].filter(Boolean);

    const sidoFilter = document.getElementById('sidoFilter');
    const cropFilter = document.getElementById('cropFilter');

    sidoFilter.innerHTML = '<option value="all">-- 전체 --</option>';
    cropFilter.innerHTML = '<option value="all">-- 전체 --</option>';

    sidos.forEach(s => sidoFilter.innerHTML += `<option value="${s}">${s}</option>`);
    crops.forEach(c => cropFilter.innerHTML += `<option value="${c}">${c}</option>`);
}

// 필터 적용 및 화면 리렌더링
function applyFilters() {
    const selectedSido = document.getElementById('sidoFilter').value;
    const selectedCrop = document.getElementById('cropFilter').value;

    filteredData = rawData.filter(item => {
        const matchSido = (selectedSido === 'all' || item.시도 === selectedSido);
        const matchCrop = (selectedCrop === 'all' || item.작물명 === selectedCrop);
        return matchSido && matchCrop;
    });

    renderStatistics();
    renderCharts();
}

// 수치형 데이터 분석 및 기초통계 계산
function renderStatistics() {
    const numericKeys = ["평균기온", "평균습도", "CO2농도", "일사량", "생육지수"];
    const tbody = document.querySelector('#numericStatsTable tbody');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">조건에 맞는 데이터가 없습니다.</td></tr>';
        return;
    }

    // 기본 구조 설계
    let stats = {
        "평균 (Mean)": {},
        "최대 (Max)": {},
        "최소 (Min)": {},
        "데이터 수 (Count)": {}
    };

    numericKeys.forEach(key => {
        const values = filteredData.map(d => d[key]).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            stats["평균 (Mean)"][key] = (sum / values.length).toFixed(1);
            stats["최대 (Max)"][key] = Math.max(...values).toFixed(1);
            stats["최소 (Min)"][key] = Math.min(...values).toFixed(1);
            stats["데이터 수 (Count)"][key] = values.length;
        } else {
            stats["평균 (Mean)"][key] = "-";
            stats["최대 (Max)"][key] = "-";
            stats["최소 (Min)"][key] = "-";
            stats["데이터 수 (Count)"][key] = 0;
        }
    });

    let html = "";
    for (let mode in stats) {
        html += `<tr>
            <td style="font-weight: bold; background-color:#fcfcfc;">${mode}</td>
            <td>${stats[mode]["평균기온"]}</td>
            <td>${stats[mode]["평균습도"]}</td>
            <td>${stats[mode]["CO2농도"]}</td>
            <td>${stats[mode]["일사량"]}</td>
            <td>${stats[mode]["생육지수"]}</td>
        </tr>`;
    }
    tbody.innerHTML = html;

    // 범주형 빈도수 계산
    renderCategoryFrequency();
}

// 범주형 데이터 빈도수 테이블 렌더링
function renderCategoryFrequency() {
    const sidoCount = {};
    const cropCount = {};

    filteredData.forEach(item => {
        if (item.시도) sidoCount[item.시도] = (sidoCount[item.시도] || 0) + 1;
        if (item.작물명) cropCount[item.작물명] = (cropCount[item.작물명] || 0) + 1;
    });

    const sidoTbody = document.querySelector('#sidoFreqTable tbody');
    sidoTbody.innerHTML = Object.keys(sidoCount).length ? 
        Object.entries(sidoCount).map(([k, v]) => `<tr><td>${k}</td><td>${v}개</td></tr>`).join('') :
        '<tr><td colspan="2" class="no-data">-</td></tr>';

    const cropTbody = document.querySelector('#cropFreqTable tbody');
    cropTbody.innerHTML = Object.keys(cropCount).length ? 
        Object.entries(cropCount).map(([k, v]) => `<tr><td>${k}</td><td>${v}개</td></tr>`).join('') :
        '<tr><td colspan="2" class="no-data">-</td></tr>';
}

// 기존 차트 파괴 함수 (리렌더링 시 메모리 누수 및 잔상 방지)
function destroyChart(chartId) {
    if (charts[chartId]) {
        charts[chartId].destroy();
    }
}

// 차트 시각화 메인 기능
function renderCharts() {
    if (filteredData.length === 0) return;

    // 데이터 정렬 및 추출
    const labels = filteredData.map(d => d.작물명 || '알수없음');
    const dates = filteredData.map(d => d.측정일자 || '미지정');
    const growthIndices = filteredData.map(d => d.생육지수);
    const temps = filteredData.map(d => d.평균기온);
    const humids = filteredData.map(d => d.평균습도);
    const radiations = filteredData.map(d => d.일사량);
    const co2Vals = filteredData.map(d => d.CO2농도);

    // --- 주제 1: 작물별 생육지수 비교 (Bar Chart) ---
    destroyChart('chart1');
    charts['chart1'] = new Chart(document.getElementById('chart1'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '생육지수',
                data: growthIndices,
                backgroundColor: 'rgba(46, 125, 50, 0.7)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 120 } }
        }
    });

    // --- 주제 2: 환경 요인(기온/습도)과 생육지수의 관계 (Line/Multi-axis) ---
    destroyChart('chart2');
    charts['chart2'] = new Chart(document.getElementById('chart2'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '평균기온(°C)',
                    data: temps,
                    borderColor: '#ff7043',
                    backgroundColor: 'transparent',
                    yAxisID: 'y',
                    tension: 0.1
                },
                {
                    label: '평균습도(%)',
                    data: humids,
                    borderColor: '#29b6f6',
                    backgroundColor: 'transparent',
                    yAxisID: 'y1',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '기온 (°C)' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '습도 (%)' } }
            }
        }
    });

    // --- 주제 3: 측정일자별 일사량 추이 (Line Chart) ---
    // 날짜 순 정렬을 위해 인덱스 매핑 후 정렬
    const dateData = filteredData.map(d => ({date: d.측정일자, rad: d.일사량})).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    destroyChart('chart3');
    charts['chart3'] = new Chart(document.getElementById('chart3'), {
        type: 'line',
        data: {
            labels: dateData.map(d => d.date),
            datasets: [{
                label: '일사량 (W/㎡)',
                data: dateData.map(d => d.rad),
                backgroundColor: 'rgba(255, 179, 0, 0.2)',
                borderColor: '#ffb300',
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // --- 주제 4: CO2 농도와 생육지수의 상관성 (Combo Chart) ---
    destroyChart('chart4');
    charts['chart4'] = new Chart(document.getElementById('chart4'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'CO2농도 (ppm)',
                    data: co2Vals,
                    backgroundColor: 'rgba(120, 144, 156, 0.6)',
                    yAxisID: 'yCo2'
                },
                {
                    type: 'line',
                    label: '생육지수',
                    data: growthIndices,
                    borderColor: '#e91e63',
                    borderWidth: 3,
                    fill: false,
                    yAxisID: 'yGrowth'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yCo2: { type: 'linear', position: 'left', title: { display: true, text: 'CO2 농도 (ppm)' } },
                yGrowth: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '생육지수' }, min: 50, max: 110 }
            }
        }
    });
}
