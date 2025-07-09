#!/usr/bin/env python
"""
EcoLoop AI Service Test Client
This script provides a simple way to test the AI image analysis service functionality.
"""

import argparse
import json
import os
import requests
import sys
from urllib.parse import urlparse

def is_valid_url(url):
    """Validate URL format"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def test_ai_service(service_url, image_url=None, endpoint="predict"):
    """Test the AI service with a single image or run diagnostics"""
    
    if not service_url.startswith(("http://", "https://")):
        service_url = f"http://{service_url}"
        
    # Validate service URL
    if not is_valid_url(service_url):
        print(f"Error: Invalid service URL: {service_url}")
        return False
        
    # Health check first
    try:
        print(f"\n🔍 Testing AI service at: {service_url}")
        health_response = requests.get(f"{service_url}/health", timeout=10)
        
        if health_response.status_code != 200:
            print(f"❌ Health check failed with status {health_response.status_code}")
            return False
            
        health_data = health_response.json()
        print(f"✅ Service status: {health_data.get('status', 'unknown')}")
        print(f"📊 Service: {health_data.get('service', 'unknown')}")
        print(f"🔧 Model: {health_data.get('model', 'unknown')}")
        print(f"📋 Version: {health_data.get('version', 'unknown')}")
        
        # Print capabilities
        if 'capabilities' in health_data:
            print("\n🛠️ Service capabilities:")
            for capability in health_data['capabilities']:
                print(f"  - {capability}")
        
        # If we have image URL, test image analysis
        if image_url and is_valid_url(image_url):
            print(f"\n🖼️ Testing image analysis for: {image_url}")
            
            # Set the endpoint based on the requested operation
            full_endpoint = f"{service_url}/{endpoint}"
            
            # Create payload
            payload = {
                "image_url": image_url
            }
            
            # Set appropriate context if using specialized endpoint
            if endpoint == "analyze-profile":
                payload["context"] = "profile"
            elif endpoint == "analyze-post":
                payload["context"] = "post"
            
            # Request analysis
            print(f"📤 Sending request to {full_endpoint}...")
            response = requests.post(
                full_endpoint,
                json=payload,
                timeout=60  # Longer timeout for image processing
            )
            
            if response.status_code != 200:
                print(f"❌ Analysis failed with status {response.status_code}")
                print(f"Error: {response.text}")
                return False
            
            # Parse and display results
            result = response.json()
            
            # Basic result information
            print("\n📝 Analysis Results:")
            print(f"  Material: {result.get('label', 'unknown')}")
            print(f"  Confidence: {result.get('confidence', 0):.1f}%")
            print(f"  Status: {result.get('status', 'unknown').upper()}")
            
            # Quality analysis
            quality = result.get('quality_analysis', {})
            print(f"  Quality score: {quality.get('quality_score', 0)}/100")
            
            # Recommendations
            if 'recommendations' in result and result['recommendations']:
                print("\n💡 Recommendations:")
                for i, rec in enumerate(result['recommendations'], 1):
                    print(f"  {i}. {rec}")
            
            # Save full JSON response to file
            with open("ai_analysis_result.json", "w") as f:
                json.dump(result, f, indent=2)
            print(f"\n🗄️ Full analysis saved to ai_analysis_result.json")
            
            return True
        elif endpoint == "test":
            # Run test suite without image
            print(f"\n🧪 Running test suite...")
            test_response = requests.get(f"{service_url}/test", timeout=30)
            
            if test_response.status_code != 200:
                print(f"❌ Test failed with status {test_response.status_code}")
                return False
                
            test_results = test_response.json()
            
            # Display test results
            total_tests = test_results.get('tests_passed', 0) + test_results.get('tests_failed', 0)
            print(f"\n📊 Test Results: {test_results.get('tests_passed', 0)}/{total_tests} passed")
            
            for i, test in enumerate(test_results.get('tests_run', []), 1):
                status = "✅ PASSED" if test.get('passed') else "❌ FAILED"
                print(f"\n  Test {i}: {test.get('name')} - {status}")
                print(f"  Description: {test.get('description')}")
                
                # Details may be a string or dict
                details = test.get('details', '')
                if isinstance(details, str):
                    print(f"  Details: {details}")
                elif isinstance(details, dict):
                    print(f"  Details:")
                    for k, v in details.items():
                        print(f"    - {k}: {v}")
            
            return True
        else:
            print("\n⚠️ No valid image URL provided for analysis.")
            print("Run with --help for usage instructions.")
            return True
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error: Could not connect to {service_url}")
        print("Make sure the AI service is running and the URL is correct.")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ Timeout: The request to {service_url} timed out")
        print("The service might be overloaded or experiencing issues.")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Test the EcoLoop AI Image Analysis Service')
    
    parser.add_argument('-s', '--service', default='http://localhost:5000',
                        help='URL of the AI service (default: http://localhost:5000)')
    parser.add_argument('-i', '--image', 
                        help='URL of an image to analyze')
    parser.add_argument('-e', '--endpoint', default='predict',
                        choices=['predict', 'analyze-profile', 'analyze-post', 'test'],
                        help='Endpoint to test (default: predict)')
    
    args = parser.parse_args()
    
    success = test_ai_service(args.service, args.image, args.endpoint)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
