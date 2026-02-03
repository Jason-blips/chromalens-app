import React, { useState, useRef, useEffect } from "react";
import ColorThief from "color-thief";

const LipstickScanner = () => {
    const [image, setImage] = useState(null);
    const [dominantColor, setDominantColor] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Start the camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Unable to access the camera:", err);
        }
    };

    // Stop the camera when the component unmounts
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Capture an image from the video stream
    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            const { videoWidth, videoHeight } = videoRef.current;
            canvasRef.current.width = videoWidth || 640;
            canvasRef.current.height = videoHeight || 480;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            setImage(canvasRef.current.toDataURL("image/png"));
        }
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // Extract the dominant color
    useEffect(() => {
        if (image) {
            const imgElement = document.createElement("img");
            imgElement.src = image;
            imgElement.crossOrigin = "Anonymous"; // Prevent cross-origin issues
            imgElement.onload = () => {
                try {
                    const colorThief = new ColorThief();
                    document.body.appendChild(imgElement);
                    const color = colorThief.getColor(imgElement);
                    setDominantColor(`rgb(${color[0]}, ${color[1]}, ${color[2]})`);
                    document.body.removeChild(imgElement);
                } catch (err) {
                    console.error("Error extracting color:", err);
                }
            };
        }
    }, [image]);

    // Reusable button component
    const Button = ({ onClick, text, color }) => (
        <button onClick={onClick} className={`bg-${color}-500 text-white px-4 py-2 rounded`}>
            {text}
        </button>
    );

    return (
        <div className="flex flex-col items-center p-4 space-y-4">
            <h2 className="text-xl font-bold">色彩分析工具</h2>
            <video ref={videoRef} autoPlay className="w-full max-w-md rounded-lg" />
            <Button onClick={startCamera} text="Start Camera" color="blue" />
            <Button onClick={captureImage} text="Capture Image" color="green" />
            <input type="file" accept="image/*" onChange={handleFileUpload} className="mt-2" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Preview captured image */}
            {image && (
                <>
                    <img src={image} alt="Captured" className="w-full max-w-md rounded-lg" />
                    {dominantColor && (
                        <div className="w-16 h-16 rounded-full mt-2" style={{ backgroundColor: dominantColor }} />
                    )}
                </>
            )}
        </div>
    );
};

export default LipstickScanner;
