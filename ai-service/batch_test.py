#!/usr/bin/env python
"""
EcoLoop AI Service Batch Test Runner
This script tests the AI service across different categories of images and generates a report.
"""

import argparse
import csv
import json
import os
import requests
import sys
import time
from datetime import datetime
from urllib.parse import urlparse

# Test image categories with example URLs
# These URLs should be replaced with valid test images in each category
TEST_IMAGES = {
    "recycled_materials": [
        "https://images.unsplash.com/photo-1582408921715-22f23935e9c1",  # plastic bottles
        "https://images.unsplash.com/photo-1619011502686-3676940975b4",  # cardboard
        "https://images.unsplash.com/photo-1536939459926-301728717817",  # metal cans
    ],
    "documents": [
        "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead",  # document
        "https://images.unsplash.com/photo-1603249399918-186131283daa",  # form
        "https://images.unsplash.com/photo-1614036417651-efe5912159c8",  # ID card
    ],
    "profile_images": [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",  # portrait
        "https://images.unsplash.com/photo-1463453091185-61582044d556",  # face
    ],
    "inappropriate": [
        "https://images.unsplash.com/photo-1582896911227-c966f6638940",  # alcohol
        "https://images.unsplash.com/photo-1578165219176-ece04edbd053",  # suspicious
    ],
    "low_quality": [
        "https://images.unsplash.com/photo-1619442214026-693a36f15686?q=10",  # low resolution
        "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=1",   # low quality
    ]
}

def run_batch_test(service_url, report_path):
    """Run batch testing across different image categories"""
    
    if not service_url.startswith(("http://", "https://")):
        service_url = f"http://{service_url}"
    
    # Create results directory if it doesn't exist
    os.makedirs(os.path.dirname(report_path) if os.path.dirname(report_path) else '.', exist_ok=True)
    
    # Initialize results
    results = []
    
    # Check service health first
    try:
        print(f"Checking AI service health at {service_url}...")
        health_response = requests.get(f"{service_url}/health", timeout=10)
        
        if health_response.status_code != 200:
            print(f"Health check failed with status {health_response.status_code}")
            return False
            
        health_data = health_response.json()
        service_status = health_data.get('status', 'unknown')
        print(f"Service status: {service_status}")
        
        if service_status != 'healthy':
            print(f"Service is not healthy. Status: {service_status}")
            return False
            
    except Exception as e:
        print(f"Error connecting to AI service: {str(e)}")
        return False
    
    # Get start time for overall timing
    start_time = time.time()
    
    print("\n--- Running batch tests ---")
    print(f"Testing {sum(len(urls) for urls in TEST_IMAGES.values())} images across {len(TEST_IMAGES)} categories")
    
    # Test each category
    for category, image_urls in TEST_IMAGES.items():
        print(f"\nTesting category: {category}")
        
        for image_url in image_urls:
            test_name = f"{category}_{image_url.split('/')[-1][:8]}"
            print(f"  Testing {test_name}: {image_url}")
            
            try:
                # Get start time for this test
                test_start = time.time()
                
                # Test each endpoint
                for endpoint in ['predict', 'analyze-profile', 'analyze-post']:
                    # Create payload
                    payload = {"image_url": image_url}
                    if endpoint == 'analyze-profile':
                        context = 'profile'
                    elif endpoint == 'analyze-post':
                        context = 'post'
                    else:
                        context = 'marketplace'
                    
                    payload['context'] = context
                    
                    # Request analysis
                    response = requests.post(
                        f"{service_url}/{endpoint}",
                        json=payload,
                        timeout=60  # Longer timeout for image processing
                    )
                    
                    if response.status_code != 200:
                        results.append({
                            'test_name': test_name,
                            'category': category,
                            'endpoint': endpoint,
                            'status': 'error',
                            'http_status': response.status_code,
                            'error_message': response.text,
                            'image_url': image_url,
                            'duration_ms': round((time.time() - test_start) * 1000)
                        })
                        print(f"    ❌ {endpoint} failed: HTTP {response.status_code}")
                        continue
                    
                    # Parse results
                    result = response.json()
                    
                    analysis_status = result.get('status', 'unknown')
                    material_label = result.get('label', 'unknown')
                    confidence = result.get('confidence', 0)
                    
                    # Determine if test passed based on category
                    expected_status = ''
                    test_passed = False
                    
                    if category == 'recycled_materials' and endpoint == 'predict':
                        expected_status = 'usable'
                        test_passed = analysis_status == 'usable' and confidence > 30
                    elif category == 'documents' and endpoint == 'predict':
                        expected_status = 'rejected'
                        test_passed = analysis_status == 'rejected'
                    elif category == 'inappropriate' and endpoint == 'predict':
                        expected_status = 'rejected'
                        test_passed = analysis_status in ['rejected', 'pending_review']
                    elif category == 'profile_images' and endpoint == 'analyze-profile':
                        expected_status = 'usable'
                        test_passed = analysis_status == 'usable'
                    elif category == 'low_quality' and endpoint == 'predict':
                        expected_status = 'pending_review'
                        test_passed = analysis_status in ['pending_review', 'rejected']
                    else:
                        # Default expected behavior
                        expected_status = 'any'
                        test_passed = response.status_code == 200
                    
                    # Calculate test duration
                    duration_ms = round((time.time() - test_start) * 1000)
                    
                    # Record results
                    results.append({
                        'test_name': f"{test_name}_{endpoint}",
                        'category': category,
                        'endpoint': endpoint,
                        'status': 'passed' if test_passed else 'failed',
                        'expected_status': expected_status,
                        'actual_status': analysis_status,
                        'material': material_label,
                        'confidence': confidence,
                        'image_url': image_url,
                        'duration_ms': duration_ms,
                        'recommendations_count': len(result.get('recommendations', [])),
                        'has_quality_data': 'quality_analysis' in result
                    })
                    
                    status_icon = "✅" if test_passed else "❌"
                    print(f"    {status_icon} {endpoint}: {analysis_status.upper()} ({material_label}, {confidence:.1f}%) - {duration_ms}ms")
                
            except Exception as e:
                results.append({
                    'test_name': test_name,
                    'category': category,
                    'status': 'error',
                    'error_message': str(e),
                    'image_url': image_url
                })
                print(f"    ❌ Error: {str(e)}")
    
    # Calculate overall metrics
    total_duration = time.time() - start_time
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.get('status') == 'passed')
    failed_tests = sum(1 for r in results if r.get('status') == 'failed')
    error_tests = sum(1 for r in results if r.get('status') == 'error')
    
    pass_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    
    # Generate summary report
    summary = {
        'timestamp': datetime.now().isoformat(),
        'service_url': service_url,
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': failed_tests,
        'error_tests': error_tests,
        'pass_rate': pass_rate,
        'total_duration_sec': total_duration
    }
    
    # Write results to CSV
    csv_path = report_path
    if not csv_path.lower().endswith('.csv'):
        csv_path += '.csv'
    
    with open(csv_path, 'w', newline='') as csvfile:
        if results:
            fieldnames = results[0].keys()
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
    
    # Also save summary as JSON
    json_path = csv_path.rsplit('.', 1)[0] + '.json'
    with open(json_path, 'w') as jsonfile:
        json.dump({
            'summary': summary,
            'results': results
        }, jsonfile, indent=2)
    
    # Print summary
    print("\n--- Test Summary ---")
    print(f"Total tests run: {total_tests}")
    print(f"Passed: {passed_tests} ({pass_rate:.1f}%)")
    print(f"Failed: {failed_tests}")
    print(f"Errors: {error_tests}")
    print(f"Total duration: {total_duration:.2f} seconds")
    print(f"\nResults saved to {csv_path} and {json_path}")
    
    return pass_rate >= 80  # Consider success if pass rate is at least 80%

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Run batch tests against the EcoLoop AI Image Analysis Service')
    
    parser.add_argument('-s', '--service', default='http://localhost:5000',
                        help='URL of the AI service (default: http://localhost:5000)')
    parser.add_argument('-r', '--report', default='ai_batch_test_results.csv',
                        help='Path to save the test report (default: ai_batch_test_results.csv)')
    
    args = parser.parse_args()
    
    success = run_batch_test(args.service, args.report)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
