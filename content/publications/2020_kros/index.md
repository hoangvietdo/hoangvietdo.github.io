---
title: "A dual fault detection algorithm based on the federated Kalman filter to enhance the reliability of the navigation system"
date: 2020-02-01
publishDate: 2020-10-13
authors: ["Eung Ju Kim", "Seong Taek Kim", "Yong Hun Kim", "Min Jun Choi", "***Hoang Viet Do***", "Jin Woo Song"]
author_notes: ["", "", "Corresponding author"]
publication_types: ["2"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "Journal of Institute of Control, Robotics and Systems"
links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE09299849&buildDate=2026-02-24+10%3A04%3A31&nowDate=20260330_1&cdnUrl=https%3A%2F%2Fcdn.dbpia.co.kr%2Fstatic&appVersion=1.0.0&buildTime=20260224100431&minify=.min&language=ko_KR&hasTopBanner=true'

# image:
#     placement: 1
#     focal_point: 'Center'
#     preview_only: false
#     caption: ""
---

### Abstract:

In this paper, we propose the dual fault detection (dual FD) algorithm for the enhancement of the navigation system reliability. The dual FD algorithm, which contributes to fast and accurate fault detection results, is constructed by fusing the measurement-based FD algorithm and system-based FD algorithm. The measurement-based algorithm uses the parity space concept and the system-based algorithm employs the federated Kalman filter. To fuse the measurement-based FD algorithm and the system-based FD algorithm, the weighting factors for each FD algorithm are added. In the measurement-based algorithm, the weighting factor related to the failure rate of each sensor is added to the parity vector. In the system-based algorithm, the weighting factor tat limits the covariance weighting is added to enhance the fault detection time. Moreover, the modified threshold for the chi-square test used in the measurement-based FD is employed in the decision-making stage to reduce the fault detection time delay without sacrificing the accuracy of fault detection. The proposed algorithm was verified using simulations for various fault types. The simulation result demonstrated that the proposed dual FD algorithm is as fast as teh measurement-based FD algorithm and as as accurate as the system-based FD algorithm.
{style="font-size: 0.95rem; text-align: justify;"}
