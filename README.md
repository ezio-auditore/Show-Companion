# Show-Companion

Get notified, right before your favorite TV Show airs! Now subscribe to Show Companion with just an email id and get notified before the show is about to air with episode details and much more.


A small MEAN stack project for gettting TV shows info from TVdb Api and implemeting subscribe for particular logged in shows where users will
get emails 2 hours before the show is aired.
The TV show posters are saved in Amazon S3 Buckets which I am using as CDN.
Has local authentication and agenda(https://github.com/rschmukler/agenda) for scheduling mail jobs.
Using Nodemailer(https://nodemailer.com/about/) with Mailgun(https://www.mailgun.com/) for sending mails.

Live Site :https://show-companion.herokuapp.com/

