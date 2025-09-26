let map;
let marker;
let pinnedLocation = null; // ตัวแปรสำหรับเก็บค่า Lat, Lng

// ฟังก์ชันนี้จะถูกเรียกโดย Google Maps API เมื่อโหลดเสร็จ
// ฟังก์ชันนี้จะถูกเรียกโดย Google Maps API เมื่อโหลดเสร็จ
function initMap() {
    const defaultLocation = { lat: 13.7563, lng: 100.5018 }; // ตำแหน่งสำรอง (กรุงเทพฯ)

    // สร้างแผนที่โดยยังไม่กำหนด center ทันที
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15, // ปรับ zoom ให้ใกล้ขึ้นเพื่อให้เห็นรายละเอียดชัดเจน
        // ... (โค้ด style ของแผนที่ยังคงเหมือนเดิม) ...
        styles: [ 
            { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#a9c5e8" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
            { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
            { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
            { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
            { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
        ]
    });

    // ตรวจสอบว่าเบราว์เซอร์รองรับ Geolocation API หรือไม่
    if (navigator.geolocation) {
        // ขอตำแหน่งปัจจุบันของผู้ใช้
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // กรณีสำเร็จ: ได้รับตำแหน่ง
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                
                // ตั้งค่า map ให้ไปที่ตำแหน่งนั้นและปักหมุดเลย
                map.setCenter(userLocation);
                placeMarker(userLocation);
                pinnedLocation = userLocation; // บันทึกตำแหน่งที่ปักไว้เลย
                updateCoordinatesDisplay(userLocation.lat, userLocation.lng);
            },
            () => {
                // กรณีล้มเหลว: ผู้ใช้ปฏิเสธหรือไม่สามารถหาตำแหน่งได้
                handleLocationError(true, map.getCenter());
            }
        );
    } else {
        // เบราว์เซอร์ไม่รองรับ Geolocation
        handleLocationError(false, map.getCenter());
    }

    // เพิ่ม Event Listener สำหรับการคลิกบนแผนที่ (ยังคงไว้เผื่อผู้ใช้ต้องการเปลี่ยนตำแหน่ง)
    map.addListener("click", (event) => {
        placeMarker(event.latLng);
        pinnedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        console.log("New Pinned Location:", pinnedLocation);
        updateCoordinatesDisplay(pinnedLocation.lat, pinnedLocation.lng);
    });
}

// ฟังก์ชันสำหรับจัดการเมื่อเกิดข้อผิดพลาดในการหาตำแหน่ง
function handleLocationError(browserHasGeolocation, pos) {
    console.log(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    
    // ใช้ตำแหน่งเริ่มต้นเป็นกรุงเทพฯ แทน
    const defaultLocation = { lat: 13.7563, lng: 100.5018 };
    map.setCenter(defaultLocation);
    alert('ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้ จะแสดงแผนที่กรุงเทพฯ เป็นค่าเริ่มต้น');
}
// ภายในไฟล์ script.js

// ... (โค้ดเดิมของ handleLocationError)

// --- ฟังก์ชันใหม่สำหรับปักหมุดตำแหน่งปัจจุบันของผู้ใช้ ---
function pinCurrentUserLocation() {
    // 1. ตรวจสอบว่าเบราว์เซอร์รองรับ Geolocation หรือไม่
    if (navigator.geolocation) {
        // 2. ขอตำแหน่งปัจจุบัน
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // 3. กรณีสำเร็จ: สร้าง object ตำแหน่ง
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // 4. ย้ายแผนที่ไปที่ตำแหน่งนั้น
                map.setCenter(userLocation);

                // 5. ปักหมุดลงบนแผนที่ (ใช้ฟังก์ชันเดิม)
                placeMarker(userLocation);

                // 6. บันทึกค่าพิกัดไว้ในตัวแปร pinnedLocation
                pinnedLocation = userLocation;

                // 7. อัปเดตการแสดงผลค่าพิกัดบนหน้าเว็บ
                updateCoordinatesDisplay(userLocation.lat, userLocation.lng);

                console.log("Pinned current user location:", pinnedLocation);
            },
            () => {
                // 8. กรณีล้มเหลว (ผู้ใช้ปฏิเสธ, หาตำแหน่งไม่ได้)
                alert('ไม่สามารถเข้าถึงตำแหน่งของคุณได้ โปรดตรวจสอบการอนุญาตในเบราว์เซอร์');
            }
        );
    } else {
        // 9. กรณีเบราว์เซอร์ไม่รองรับ Geolocation
        alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่งครับ');
    }
}

// --- เชื่อมต่อปุ่มกับฟังก์ชันที่เราสร้าง ---
// ควรวางโค้ดส่วนนี้ไว้ในส่วนล่างๆ ของไฟล์ script.js ก่อน }; ของ initMap
document.addEventListener('DOMContentLoaded', (event) => {
    const pinBtn = document.getElementById('pin-current-location-btn');
    if(pinBtn) {
        pinBtn.addEventListener('click', pinCurrentUserLocation);
    }
});

// ฟังก์ชันสำหรับปักหมุด (placeMarker) ยังคงเหมือนเดิม ไม่ต้องแก้ไข
// ...

// โค้ดส่วนที่จัดการการส่งฟอร์ม (addEventListener) ยังคงเหมือนเดิม ไม่ต้องแก้ไข
// ...

// ฟังก์ชันสำหรับปักหมุด
/**
 * ฟังก์ชันสำหรับอัปเดตการแสดงผลพิกัดบนหน้าเว็บ
 * @param {number} lat - ค่าละติจูด
 * @param {number} lng - ค่าลองจิจูด
 */
function updateCoordinatesDisplay(lat, lng) {
    const instructionText = document.querySelector('.pin-instruction'); // อาจไม่มีในหน้าใหม่
    const coordinatesDiv = document.getElementById('coordinates-display');

    if (!coordinatesDiv) return; // กัน error ถ้า element ไม่มีจริง

    const hasCoords = (lat !== null && lat !== undefined && lng !== null && lng !== undefined);
    if (hasCoords) {
        const latStr = Number(lat).toFixed(6);
        const lngStr = Number(lng).toFixed(6);
        coordinatesDiv.innerHTML = `<span class="thai-text">ละติจูด:</span> ${latStr}, <span class=\"thai-text\">ลองจิจูด:</span> ${lngStr}`;
        if (instructionText) instructionText.style.display = 'none';
    } else {
        coordinatesDiv.innerHTML = '';
        if (instructionText) instructionText.style.display = 'block';
    }
}

function placeMarker(location) {
    // ถ้ามีหมุดเก่าอยู่แล้ว ให้ลบออกก่อน
    if (marker) {
        marker.setMap(null);
    }
    // สร้างหมุดใหม่
    marker = new google.maps.Marker({
        position: location,
        map: map,
    });
}

// จัดการการส่งฟอร์ม (เวอร์ชันจริงอยู่ด้านล่าง ใช้เพียงตัวเดียว)

const CLOUDINARY_UPLOAD_PRESET = 'report twin bkk'; // ใส่ชื่อ Upload Preset ที่คุณสร้าง
const CLOUDINARY_CLOUD_NAME = 'da9vzfqrx'; // ใส่ Cloud Name ของคุณ
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


document.getElementById('reportForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const title = document.getElementById('problemTitle').value;
    const details = document.getElementById('problemDetails').value;
    const imageFile = document.getElementById('problemImage').files[0];

    if (!pinnedLocation) {
        alert('กรุณาปักหมุดตำแหน่งในแผนที่ก่อนครับ');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Report';
        return;
    }

    try {
        let imageUrl = '';

        // --- ส่วนที่ 1: อัปโหลดรูปไป Cloudinary ---
        if (imageFile) {
            console.log('Uploading image to Cloudinary...');
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Cloudinary upload failed.');
            }

            const data = await response.json();
            imageUrl = data.secure_url; // ดึง URL ของรูปที่อัปโหลดสำเร็จ
            console.log('Image uploaded successfully:', imageUrl);
        }

        // --- ส่วนที่ 2: บันทึกข้อมูล (พร้อม URL รูปจาก Cloudinary) ลง Firestore ---
        console.log('Saving data to Firestore...');
        const reportData = {
            status: (document.getElementById('status')?.value || 'pending'),
            title: title,
            details: details,
            lat: pinnedLocation.lat.toString(),
            lng: pinnedLocation.lng.toString(),
            imageUrl: imageUrl, // ใช้ URL จาก Cloudinary
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

    const docRef = await db.collection('reports').add(reportData);
        console.log('Report saved to Firestore with ID:', docRef.id);

    showToast('ส่ง Report เรียบร้อยแล้ว!', 'success');
        document.getElementById('reportForm').reset();
        // รีเซ็ตชื่อไฟล์ที่เลือกให้กลับเป็นค่าเริ่มต้น ถ้ามี element
        try {
            const fileLabel = document.getElementById('file-chosen-text');
            if (fileLabel) fileLabel.textContent = 'ยังไม่ได้เลือกไฟล์';
        } catch(_) {}
        if (marker) marker.setMap(null);
        pinnedLocation = null;
        updateCoordinatesDisplay(null, null);

    } catch (error) {
        console.error("Error submitting report: ", error);
        showToast('เกิดข้อผิดพลาดในการส่ง Report กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Report';
    }
});

const actualFileInput = document.getElementById('problemImage');
const fileChosenText = document.getElementById('file-chosen-text');

actualFileInput.addEventListener('change', function(){
    // ตรวจสอบว่ามีไฟล์ถูกเลือกหรือไม่
    if (this.files.length > 0) {
        // นำชื่อไฟล์แรกมาแสดงผล
        fileChosenText.textContent = this.files[0].name;
    } else {
        fileChosenText.textContent = 'ยังไม่ได้เลือกไฟล์';
    }
});

// Tailwind toast helper
function showToast(message, type = 'info') {
    try {
        const toast = document.getElementById('toast');
        const text = document.getElementById('toastText');
        if (!toast || !text) {
            // fallback
            console.log('Toast:', message);
            return;
        }
        text.textContent = message;
        // set color by type
        const base = 'rounded-xl px-4 py-2 text-sm ring-1';
        const styles = {
            success: 'bg-emerald-600/90 text-white ring-emerald-300/40',
            error: 'bg-rose-600/90 text-white ring-rose-300/40',
            info: 'bg-black/80 text-white ring-white/15'
        };
        text.className = base + ' ' + (styles[type] || styles.info);

        toast.classList.remove('hidden');
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 8px)';

        // animate in
        requestAnimationFrame(() => {
            toast.style.transition = 'opacity .25s ease, transform .25s ease';
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, 0)';
        });

        // auto hide
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 8px)';
            setTimeout(() => toast.classList.add('hidden'), 250);
        }, 2600);
    } catch (_) {}
}

