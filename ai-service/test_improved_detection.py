import requests
import json
import sys
import time
import os
import base64
import threading
from flask import Flask, send_from_directory
import socket

# Define the local test images from the test_images directory
test_images_dir = "test_images"
test_images = {
    "bottle.png": "A plastic bottle (recyclable)",
    "plastic_containres.png": "Plastic containers (recyclable)",
    "paper_pags.png": "Paper bags (recyclable)",
    "wood.png": "Wood (recyclable)",
    "screw_driver.png": "Screwdriver (tool/recyclable)",
    "blurred_bottles.png": "Blurred bottles (recyclable, low quality)",
    "doc_card.png": "Document card (document)",
    "id -card.png": "ID card (document)",
    "mail.png": "Mail/letter (document)"
}

ai_service_url = "http://localhost:5001"  # AI service port
test_server_port = 5500  # Local test server port

# Create a simple Flask server to serve test images
test_server = Flask(__name__)

@test_server.route('/images/<path:filename>')
def serve_image(filename):
    """Serve test images"""
    return send_from_directory(os.path.abspath(test_images_dir), filename)

# Start test server in a separate thread
def start_test_server():
    test_server.run(host='localhost', port=test_server_port, debug=False)

# Find an available port for our test server
def find_available_port(start_port):
    port = start_port
    while port < start_port + 100:  # Try up to 100 ports
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('localhost', port))
            sock.close()
            return port
        except OSError:
            port += 1
        finally:
            sock.close()
    raise RuntimeError("Could not find an available port")

# Start the test server if not already running
def ensure_test_server():
    global test_server_port
    # Find an available port
    test_server_port = find_available_port(test_server_port)
    print(f"Starting test image server on port {test_server_port}")
    server_thread = threading.Thread(target=start_test_server, daemon=True)
    server_thread.start()
    # Give the server a moment to start
    time.sleep(2)

def test_image(filename, description):
    """Test a local image against the AI service"""
    print(f"\n============== TESTING: {filename} ==============")
    print(f"Description: {description}")
    
    # Validate that the image exists locally
    image_path = os.path.join(test_images_dir, filename)
    if not os.path.exists(image_path):
        print(f"Error: Image file {image_path} not found!")
        return False
    
    # Create a URL for the image on our test server
    image_url = f"http://localhost:{test_server_port}/images/{filename}"
    
    # Prepare payload for the AI service
    payload = {
        "image_url": image_url,
        "context": "marketplace"
    }

    # Send request
    try:
        print(f"Sending request to {ai_service_url}/predict")
        response = requests.post(
            f"{ai_service_url}/predict",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Print key findings
            print("\n=== DOCUMENT DETECTION RESULTS ===")
            doc_analysis = result.get("document_analysis", {})
            is_document = doc_analysis.get("is_document", False)
            doc_confidence = doc_analysis.get("confidence", 0)
            doc_type = doc_analysis.get("document_type")
            detection_method = doc_analysis.get("detection_method")
            
            # Check if specific_issue is 'document'
            specific_issue = result.get("specific_issue")
            rejection_reason = result.get("rejection_reason")
            
            print(f"Is document: {is_document}")
            print(f"Document confidence: {doc_confidence:.1f}%")
            if doc_type:
                print(f"Document type: {doc_type}")
            if detection_method:
                print(f"Detection method: {detection_method}")
            print(f"Specific issue: {specific_issue}")
            print(f"Rejection reason: {rejection_reason}")
            
            # Print text analysis if available
            if "text_analysis" in doc_analysis:
                text_analysis = doc_analysis["text_analysis"]
                print(f"\n--- Text Analysis ---")
                print(f"Has text pattern: {text_analysis.get('has_text_pattern', False)}")
                print(f"Text confidence: {text_analysis.get('confidence', 0):.1f}%")
                print(f"Text contours: {text_analysis.get('text_contours', 0)}")
                if 'text_like_contours' in text_analysis:
                    print(f"Text-like contours: {text_analysis.get('text_like_contours', 0)}")
                if 'line_clusters' in text_analysis:
                    print(f"Line clusters: {text_analysis.get('line_clusters', 0)}")
                if 'large_object_detected' in text_analysis:
                    print(f"Large object detected: {text_analysis.get('large_object_detected', False)}")
                
                # Print physical object evidence (new in our improved detection)
                if "physical_object_evidence" in text_analysis and text_analysis["physical_object_evidence"]:
                    print(f"\n--- Physical Object Evidence ---")
                    for item in text_analysis.get("physical_object_evidence", []):
                        print(f"- {item}")
            
            # Print visual patterns if available
            if "visual_patterns" in doc_analysis:
                patterns = doc_analysis["visual_patterns"]
                print(f"\n--- Visual Patterns ---")
                print(f"Document pattern score: {patterns.get('document_pattern_score', 0)}")
                print(f"Has document patterns: {patterns.get('has_document_patterns', False)}")
                
                # Print document pattern evidence
                if "evidence" in patterns and patterns["evidence"]:
                    print("\nDocument Evidence:")
                    for item in patterns["evidence"]:
                        print(f"- {item}")
                
                # Print recyclable evidence (new in our improved detection)
                if "recyclable_evidence" in patterns and patterns["recyclable_evidence"]:
                    print("\nRecyclable Evidence:")
                    for item in patterns["recyclable_evidence"]:
                        print(f"- {item}")
                
                if "has_large_central_object" in patterns:
                    print(f"Large central object: {patterns.get('has_large_central_object', False)}")
                    if patterns.get('has_large_central_object', False):
                        print(f"Large object ratio: {patterns.get('large_object_ratio', 0):.2f}")
            
            # Print final status and recommendations
            print(f"\n=== FINAL RESULT ===")
            print(f"Material: {result.get('label')} ({result.get('raw_label')})")
            print(f"Confidence: {result.get('confidence', 0):.1f}%")
            print(f"Status: {result.get('status')}")
            print(f"Admin status: {result.get('admin_status', '')}")
            print(f"Review required: {result.get('admin_review_required', False)}")
            
            if result.get("rejection_reason"):
                print(f"Rejection reason: {result.get('rejection_reason')}")
            
            if result.get("specific_issue"):
                print(f"Specific issue: {result.get('specific_issue')}")
                
            # Print recommendations
            if "recommendations" in result and result["recommendations"]:
                print(f"\n=== USER RECOMMENDATIONS ===")
                for rec in result["recommendations"]:
                    print(f"- {rec}")
                    
            return result
        else:
            print(f"Error: Request failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# Main function to run tests
if __name__ == "__main__":
    print("EcoLoop AI Service - Improved Document Detection Test")
    print(f"Testing local images from: {test_images_dir}")
    print(f"AI Service URL: {ai_service_url}")
    print("-" * 60)
    
    # Check if test_images directory exists
    if not os.path.isdir(test_images_dir):
        print(f"Error: Test images directory '{test_images_dir}' not found.")
        sys.exit(1)
        
    # Count files in the directory
    available_images = [f for f in os.listdir(test_images_dir) if os.path.isfile(os.path.join(test_images_dir, f))]
    if not available_images:
        print(f"Error: No image files found in '{test_images_dir}'.")
        sys.exit(1)
    
    print(f"Found {len(available_images)} images in test directory.")
    print(f"Found {len(test_images)} configured test images to test.")
    
    # Start the test server to serve local images
    try:
        ensure_test_server()
        print(f"Test server is running at http://localhost:{test_server_port}")
    except Exception as e:
        print(f"Error starting test server: {e}")
        sys.exit(1)
    
    # Track results
    document_results = {}
    recyclable_results = {}
    
    # Run tests
    for name, desc in test_images.items():
        result = test_image(name, desc)
        
        # Categorize the result
        if result:
            if "document" in name.lower() or "card" in name.lower() or "mail" in name.lower():
                document_results[name] = result
            else:
                recyclable_results[name] = result
        
        # Add a small delay between requests
        time.sleep(1)
    
    # Print summary results
    print("\n\n========= SUMMARY RESULTS =========")
    
    print("\nRECYCLABLE MATERIALS:")
    for name, result in recyclable_results.items():
        if result:
            doc_analysis = result.get("document_analysis", {})
            is_document = doc_analysis.get("is_document", False)
            specific_issue = result.get("specific_issue")
            is_doc_by_issue = specific_issue == "document"
            rejection_reason = result.get("rejection_reason")
            is_doc_by_rejection = rejection_reason == "document_detected"
            
            status = result.get("status")
            is_marked_as_doc = is_document or is_doc_by_issue or is_doc_by_rejection
            status_color = "RED" if is_marked_as_doc else "GREEN"  # Should NOT be detected as documents
            print(f"{name}: Detected as document: {is_marked_as_doc} ({status_color}), Status: {status}")
    
    print("\nDOCUMENTS:")
    for name, result in document_results.items():
        if result:
            doc_analysis = result.get("document_analysis", {})
            is_document = doc_analysis.get("is_document", False)
            specific_issue = result.get("specific_issue")
            is_doc_by_issue = specific_issue == "document"
            rejection_reason = result.get("rejection_reason")
            is_doc_by_rejection = rejection_reason == "document_detected"
            
            status = result.get("status")
            is_marked_as_doc = is_document or is_doc_by_issue or is_doc_by_rejection
            status_color = "GREEN" if is_marked_as_doc else "RED"  # SHOULD be detected as documents
            print(f"{name}: Detected as document: {is_marked_as_doc} ({status_color}), Status: {status}")
    
    # Calculate accuracy
    total_correct = 0
    total_tested = len(document_results) + len(recyclable_results)
    
    for name, result in recyclable_results.items():
        if result:
            doc_analysis = result.get("document_analysis", {})
            is_document = doc_analysis.get("is_document", False)
            specific_issue = result.get("specific_issue")
            is_doc_by_issue = specific_issue == "document"
            rejection_reason = result.get("rejection_reason")
            is_doc_by_rejection = rejection_reason == "document_detected"
            is_marked_as_doc = is_document or is_doc_by_issue or is_doc_by_rejection
            
            if not is_marked_as_doc:
                total_correct += 1
            
    for name, result in document_results.items():
        if result:
            doc_analysis = result.get("document_analysis", {})
            is_document = doc_analysis.get("is_document", False)
            specific_issue = result.get("specific_issue")
            is_doc_by_issue = specific_issue == "document"
            rejection_reason = result.get("rejection_reason")
            is_doc_by_rejection = rejection_reason == "document_detected"
            is_marked_as_doc = is_document or is_doc_by_issue or is_doc_by_rejection
            
            if is_marked_as_doc:
                total_correct += 1
    
    if total_tested > 0:
        accuracy = (total_correct / total_tested) * 100
        print(f"\nOverall accuracy: {accuracy:.1f}% ({total_correct}/{total_tested} correct)")
    else:
        print("\nNo valid test results to calculate accuracy.")
