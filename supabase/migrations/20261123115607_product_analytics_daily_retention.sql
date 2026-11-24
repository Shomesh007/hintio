create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('hintio-product-analytics-retention', '23 3 * * *', 'select hintio_analytics.purge_expired_events();');
