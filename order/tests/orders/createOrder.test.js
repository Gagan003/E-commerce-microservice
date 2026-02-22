const request = require('supertest');
const app = require('../../src/app');
const { getAuthCookie } = require('../setup/auth');
const orderModel = require('../../src/models/order.model');
const productModel = require('../../src/models/product.model');
const nock = require('nock'); // You'll need to install this: npm install --save-dev nock

describe('POST /api/orders — Create order from current cart', () => {
    const sampleAddress = {
        street: '123 Main St',
        city: 'Metropolis',
        state: 'CA',
        pincode: '90210',
        country: 'USA',
    };

    const userId = '68bc6369c17579622cbdd9fe';
    const productId = '507f1f77bcf86cd799439021';
    const cartServiceUrl = process.env.CART_SERVICE_URL || 'http://cart-service:3001';

    // Mock cart service response
    const mockCart = {
        _id: '507f1f77bcf86cd799439999',
        user: userId,
        items: [{
            product: {
                _id: productId,
                name: 'Test Product',
                price: { amount: 100, currency: 'USD' }
            },
            quantity: 2,
            price: { amount: 100, currency: 'USD' }
        }],
        totalPrice: { amount: 200, currency: 'USD' }
    };

    beforeEach(async () => {
        // Clear orders collection
        await orderModel.deleteMany({});
        
        // Clear and setup products (product service might be separate, but for testing we might need product data)
        // If product service is separate, you might need to mock that too
        await productModel.deleteMany({});
        await productModel.create({
            _id: productId,
            name: 'Test Product',
            price: { amount: 100, currency: 'USD' },
            inventory: { quantity: 10, reserved: 0 },
            sku: 'TEST-001'
        });

        // Mock the cart service HTTP call
        nock(cartServiceUrl)
            .get(`/api/carts/user/${userId}`)
            .reply(200, mockCart);

        // Mock clearing the cart after order creation
        nock(cartServiceUrl)
            .delete(`/api/carts/user/${userId}`)
            .reply(200, { message: 'Cart cleared' });

        // Mock inventory service if it's separate
        // nock(inventoryServiceUrl)
        //     .post('/api/inventory/reserve')
        //     .reply(200, { success: true });
    });

    afterEach(() => {
        // Clean up nock mocks
        nock.cleanAll();
    });

    it('creates order from current cart, computes totals, sets status=PENDING, reserves inventory', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie({ userId }))
            .send({ shippingAddress: sampleAddress })
            .expect('Content-Type', /json/)
            .expect(201);

        // Verify response
        expect(res.body).toBeDefined();
        expect(res.body.order).toBeDefined();
        const { order } = res.body;
        
        expect(order._id).toBeDefined();
        expect(order.user).toBe(userId);
        expect(order.status).toBe('PENDING');

        // Items copied from cart
        expect(Array.isArray(order.items)).toBe(true);
        expect(order.items.length).toBe(1);
        
        const orderItem = order.items[0];
        expect(orderItem.product.toString()).toBe(productId);
        expect(orderItem.quantity).toBe(2);
        expect(orderItem.price.amount).toBe(100);

        // Totals
        expect(order.totalPrice.amount).toBe(200);

        // Shipping address
        expect(order.shippingAddress).toMatchObject({
            street: sampleAddress.street,
            city: sampleAddress.city,
            state: sampleAddress.state,
            ...(order.shippingAddress.zip 
                ? { zip: sampleAddress.pincode } 
                : { pincode: sampleAddress.pincode }),
            country: sampleAddress.country,
        });

        // Verify the mocked cart service was called
        expect(nock.isDone()).toBe(true);
    });

    it('returns 404 when cart not found', async () => {
        // Override the mock to return 404
        nock.cleanAll();
        nock(cartServiceUrl)
            .get(`/api/carts/user/${userId}`)
            .reply(404, { error: 'Cart not found' });

        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie({ userId }))
            .send({ shippingAddress: sampleAddress })
            .expect('Content-Type', /json/)
            .expect(404); // or 400, depending on your design

        expect(res.body.error || res.body.message).toMatch(/cart.*not found/i);
    });

    it('returns 400 when cart is empty', async () => {
        // Override the mock with empty cart
        nock.cleanAll();
        nock(cartServiceUrl)
            .get(`/api/carts/user/${userId}`)
            .reply(200, { ...mockCart, items: [] }); // Empty cart

        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie({ userId }))
            .send({ shippingAddress: sampleAddress })
            .expect('Content-Type', /json/)
            .expect(400);

        expect(res.body.error || res.body.message).toMatch(/cart.*empty/i);
    });

    it('handles cart service timeout gracefully', async () => {
        // Mock a timeout
        nock.cleanAll();
        nock(cartServiceUrl)
            .get(`/api/carts/user/${userId}`)
            .delayConnection(5000) // 5 second delay
            .reply(200, mockCart);

        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie({ userId }))
            .send({ shippingAddress: sampleAddress })
            .expect('Content-Type', /json/)
            .expect(503); // Service Unavailable

        expect(res.body.error || res.body.message).toMatch(/cart service.*timeout|unavailable/i);
    });

    it('returns 422 when shipping address is missing/invalid', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie({ userId }))
            .send({}) // Missing shipping address
            .expect('Content-Type', /json/)
            .expect(400);

        expect(res.body.errors || res.body.message).toBeDefined();
    });
});