class ApiResponse extends Error {
    constructor(
        statusCode,
        message = "Success",
        data,
       
    ) {
        super(message),
            this.statusCode = statusCode,
            this.data = null,
            this.message = message,
            this.success = statusCode < 400
    }
}


export { ApiResponse }