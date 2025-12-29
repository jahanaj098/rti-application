/**
 * Kerala RTI Online Drafting Assistant - Core Logic
 */

// --- Regional Data ---
const DISTRICTS = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
    "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad",
    "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
];

const LOCAL_BODIES_DATA = {
    "Thiruvananthapuram-Municipal Corporation": ["Thiruvananthapuram Corporation"],
    "Thiruvananthapuram-Municipality": ["Neyyattinkara", "Attingal", "Nedumangad", "Varkala"],
    "Thiruvananthapuram-Grama Panchayat": ["Kalliyoor", "Balaramapuram", "Malayinkeezhu", "Vilappil", "Maranalloor"],
    "Ernakulam-Municipal Corporation": ["Kochi Corporation"],
    "Ernakulam-Municipality": ["Aluva", "Angamaly", "Eloor", "Kalamassery", "Kothamangalam", "Maradu", "Muvattupuzha", "North Paravur", "Perumbavoor", "Thrikkakara", "Thrippunithura"],
    "Kozhikode-Municipal Corporation": ["Kozhikode Corporation"],
    "Kozhikode-Municipality": ["Feroke", "Koduvally", "Koyilandy", "Mukkam", "Payyoli", "Ramanattukara", "Vatakara"],
    "Malappuram-Municipality": ["Manjeri", "Malappuram", "Kottakkal", "Ponnani", "Tirur", "Perinthalmanna", "Nilambur"],
    "Kannur-Municipal Corporation": ["Kannur Corporation"],
    "Thrissur-Municipal Corporation": ["Thrissur Corporation"],
    "Kollam-Municipal Corporation": ["Kollam Corporation"]
};

// --- App State ---
let currentStep = 1;
const totalSteps = 4;
let signaturePad = null;

// --- Initialize Components ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initForm();
    initSignature();
});

function initForm() {
    // Set default date
    document.getElementById('decl-date').value = new Date().toISOString().split('T')[0];

    // Populate Districts
    const distSelect = document.getElementById('district-select');
    DISTRICTS.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        distSelect.appendChild(opt);
    });

    // Authority Mapping
    const typeSelect = document.getElementById('type-select');
    const nameSelect = document.getElementById('name-select');

    const updateNames = () => {
        const d = distSelect.value;
        const t = typeSelect.value;
        nameSelect.innerHTML = '<option value="">Choose Local Body</option>';
        if (d && t) {
            const key = `${d}-${t}`;
            const bodies = LOCAL_BODIES_DATA[key] || [`Sample ${t} in ${d}`, `General PIO - ${d}`];
            bodies.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = b;
                nameSelect.appendChild(opt);
            });
            nameSelect.disabled = false;
        } else {
            nameSelect.disabled = true;
        }
    };

    distSelect.onchange = updateNames;
    typeSelect.onchange = updateNames;

    // Dynamic Questions
    let qCount = 1;
    document.getElementById('add-q').onclick = () => {
        if (qCount >= 10) return;
        qCount++;
        const div = document.createElement('div');
        div.className = 'q-group relative bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-widest">Question ${qCount}</span>
                <button type="button" class="text-red-400 hover:text-red-600 remove-q transition-colors"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
            <textarea name="q${qCount}" required class="w-full bg-transparent outline-none text-sm mt-3" rows="2" placeholder="Ask another specific question..."></textarea>
        `;
        document.getElementById('questions-container').appendChild(div);
        lucide.createIcons();
        div.querySelector('.remove-q').onclick = () => {
            div.remove();
            reorderQuestions();
        };
        qCount = document.querySelectorAll('.q-group').length;
    };

    function reorderQuestions() {
        const groups = document.querySelectorAll('.q-group');
        groups.forEach((group, index) => {
            const num = index + 1;
            group.querySelector('span').textContent = `Question ${num}`;
            group.querySelector('textarea').name = `q${num}`;
        });
        qCount = groups.length;
    }

    // Wizard Handles
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');

    nextBtn.onclick = () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateWizardUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    prevBtn.onclick = () => {
        currentStep--;
        updateWizardUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    document.getElementById('rti-form').onsubmit = (e) => {
        e.preventDefault();
        if (signaturePad.isEmpty()) {
            alert('A signature is mandatory for a valid RTI application.');
            return;
        }
        processSubmission(e.target);
    };
}

function initSignature() {
    const canvas = document.getElementById('sig-pad');
    const placeholder = document.getElementById('sig-placeholder');
    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        onBegin: () => placeholder.classList.add('hidden')
    });

    const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
        placeholder.classList.remove('hidden');
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    document.getElementById('clear-sig').onclick = () => {
        signaturePad.clear();
        placeholder.classList.remove('hidden');
    };

    const handleSigFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                signaturePad.fromDataURL(event.target.result);
                placeholder.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    };
    document.getElementById('sig-file').onchange = handleSigFile;
    document.getElementById('sig-cam').onchange = handleSigFile;
}

function validateStep(stepNum) {
    const activeStep = document.querySelector(`.step[data-step="${stepNum}"]`);
    const inputs = activeStep.querySelectorAll('[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.remove('border-slate-100');
            input.classList.add('border-red-300', 'bg-red-50');
            isValid = false;
        } else {
            input.classList.add('border-slate-100');
            input.classList.remove('border-red-300', 'bg-red-50');
        }
    });
    return isValid;
}

function updateWizardUI() {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

    document.querySelectorAll('.step-circle').forEach(circle => {
        const s = parseInt(circle.dataset.step);
        const circleDiv = circle.querySelector('div');
        const span = circle.querySelector('span');

        if (s === currentStep) {
            circleDiv.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-primary-600 text-white shadow-lg ring-4 ring-white scale-110 transition-all";
            span.className = "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-primary-600 whitespace-nowrap";
        } else if (s < currentStep) {
            circleDiv.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-green-500 text-white shadow-md ring-2 ring-white";
            circleDiv.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i>';
            span.className = "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-green-500 whitespace-nowrap";
        } else {
            circleDiv.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-white border-2 border-slate-200 text-slate-400 shadow-sm transition-all";
            circleDiv.innerHTML = s;
            span.className = "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap";
        }
    });

    lucide.createIcons();
    document.getElementById('prev-btn').classList.toggle('hidden', currentStep === 1);
    document.getElementById('next-btn').classList.toggle('hidden', currentStep === totalSteps);
    document.getElementById('submit-btn').classList.toggle('hidden', currentStep !== totalSteps);
}

function processSubmission(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // Process Questions
    const questions = [];
    document.querySelectorAll('.q-group textarea').forEach(txt => {
        const val = txt.value.trim();
        if (val) questions.push(val);
    });
    data.questions = questions;
    data.signature = signaturePad.toDataURL();

    try {
        generatePDF(data);
        showSuccessState();
    } catch (err) {
        console.error(err);
        alert("Failed to generate PDF. Please check your browser's console.");
    }
}

function showSuccessState() {
    document.getElementById('rti-form').classList.add('hidden');
    document.querySelector('.container .mb-12').classList.add('hidden'); // Hide progress
    document.getElementById('success-view').classList.remove('hidden');
    lucide.createIcons();
}

function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Build PDF Document
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("FORM A", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(11);
    doc.text("Application for Information under Section 6(1) of the RTI Act, 2005", 105, y, { align: "center" });
    y += 15;

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("To,", margin, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("The State Public Information Officer,", margin, y); y += 6;
    doc.text(`${data.localBodyName}, ${data.localBodyType},`, margin, y); y += 6;
    doc.text(`${data.district} District, Kerala.`, margin, y); y += 15;

    doc.setFont("helvetica", "bold"); doc.text("1. Name of the Applicant:", margin, y);
    doc.setFont("helvetica", "normal"); doc.text(data.applicantName, margin + 55, y); y += 10;

    doc.setFont("helvetica", "bold"); doc.text("2. Address:", margin, y);
    doc.setFont("helvetica", "normal");
    const sAddr = doc.splitTextToSize(data.address, 120);
    doc.text(sAddr, margin + 55, y); y += (sAddr.length * 6) + 3;

    doc.setFont("helvetica", "bold"); doc.text("3. Particulars of Information Required:", margin, y); y += 10;
    doc.text("(i) Subject Matter:", margin + 5, y);
    doc.setFont("helvetica", "normal");
    const sSub = doc.splitTextToSize(data.subject, 130);
    doc.text(sSub, margin + 45, y); y += (sSub.length * 6) + 4;

    doc.setFont("helvetica", "bold"); doc.text("(ii) Specific Questions:", margin + 5, y); y += 8;
    doc.setFont("helvetica", "normal");
    data.questions.forEach((q, i) => {
        const sq = doc.splitTextToSize(`${i + 1}. ${q}`, 155);
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(sq, margin + 10, y); y += (sq.length * 6) + 2;
    });

    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.text("4. Application Fee Details:", margin, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Enclosed an amount of Rs. 10/- by way of court fee stamp.", margin + 5, y); y += 18;

    doc.setFont("helvetica", "italic"); doc.setFontSize(10);
    const dec = "I state that the information sought does not fall within the restrictions contained in Section 8 and 9 of the RTI Act and to the best of my knowledge it pertains to your office.";
    const sDec = doc.splitTextToSize(dec, 170);
    doc.text(sDec, margin, y); y += 22;

    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text(`Place: ${data.declPlace}`, margin, y);
    doc.text("Yours faithfully,", 140, y); y += 7;
    doc.text(`Date: ${data.declDate}`, margin, y);

    try {
        doc.addImage(data.signature, 'PNG', 140, y, 40, 20);
    } catch (e) { console.error("Could not add signature image", e); }

    y += 24;
    doc.text(`(${data.applicantName})`, 140, y);

    doc.save(`RTI_Application_Kerala_${data.applicantName.replace(/\s+/g, '_')}.pdf`);
}
