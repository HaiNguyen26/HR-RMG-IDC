#!/bin/bash
# Shell script để chạy serve cho frontend
# Tránh lỗi PM2 parse args sai

cd /var/www/hr-rmg-idc/frontend
exec npx serve -s build -l 3002

