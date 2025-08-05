---
title: DeRO
subtitle: 'DeRO: Dead Reckoning Based on Radar Odometry With Accelerometers Aided for Robot Localization'
date: 2024-10-14
publishDate: 2024-10-14
show_date: false
reading_time: true
pager: true

summary: IROS 2024, Radar-Inertial Navigation System, Doppler Velocity, Dead Reckoning, 3D Point Cloud Registration

# # Optional external URL for project (replaces project detail page).
# external_link: https://example.org

links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://ieeexplore.ieee.org/abstract/document/8952412'
  - icon_pack: fas
    icon: scroll
    name: arXiv
    url: 'https://arxiv.org/abs/2403.05136'
  - icon_pack: fab
    icon: github
    name: Code
    url: 'https://github.com/hoangvietdo/dero'

image:
  # caption: Photo by Toa Heftiba on Unsplash
  preview_only: true
  placement: 1
  focal_point: center
---

This is a ROS 2 package for DeRO, written in C++. DeRO utilizes 4D point cloud measurements from a millimeter-wave Frequency-Modulated Continuous Wave (FMCW) radar and IMU measurements to estimate the robot's poses. Specifically, Doppler velocity and gyroscope measurements are used to calculate odometry, while the radar's range and accelerometer measurements are utilized to update the estimation using a Stochastic Cloning Extended Kalman Filter (SCEKF).

<img src="/images/manhattan.png" align="center"/>

{style="font-size: 0.95rem; text-align: justify;"}

<img src="/images/carried_4.gif" align="center"/>